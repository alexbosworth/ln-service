const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {fail} = require('node:assert').strict;
const test = require('node:test');

const asyncEach = require('async/each');
const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {closeChannel} = require('./../../');
const {createInvoice} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {payViaRoutes} = require('./../../');
const {sendMessageToPeer} = require('./../../');
const {subscribeToInvoice} = require('./../../');
const {subscribeToRpcRequests} = require('./../../');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const interval = 10;
const message = '00';
const subscribeInvoiceUri = '/invoicesrpc.Invoices/SubscribeSingleInvoice';
const times = 2000;

// Subscribing to RPC requests should listen for RPC requests
test(`Subscribe to RPC requests`, async () => {
  // LND 0.13.4 and below do not support subscribing to RPC requests
  {
    const [{id, kill, lnd}] = (await spawnLightningCluster({})).nodes;

    try {
      await sendMessageToPeer({lnd, message, public_key: id});
    } catch (err) {
      const [, code] = err;

      if (code === 'SendMessageToPeerMethodNotSupported') {
        await kill({});

        return;
      }
    }

    await kill({});
  }

  const kills = [];

  await asyncRetry({interval: 1000}, async () => {
    const {kill, nodes} = await spawnLightningCluster({
      lnd_configuration: ['--rpcmiddleware.enable'],
    });

    kills.push(kill);

    const [{generate, lnd, id: key}] = nodes;

    const rpcRequestsSub = (await subscribeToRpcRequests({lnd})).subscription;

    await delay(2000);

    const intercepted = [];

    rpcRequestsSub.on('error', error => intercepted.push({error}));
    rpcRequestsSub.on('request', request => intercepted.push({request}));
    rpcRequestsSub.on('response', response => intercepted.push({response}));

    // Make sure that target is synced to the chain otherwise invoice can halt
    await asyncRetry({interval, times}, async () => {
      const wallet = await getWalletInfo({lnd});

      await generate({});

      if (!wallet.is_synced_to_chain) {
        throw new Error('WaitingForSyncToChain');
      }
    });

    const {id} = await createInvoice({lnd});

    const invoicesSub = subscribeToInvoice({id, lnd});

    invoicesSub.on('invoice_updated', update => {});

    await getWalletInfo({lnd});

    const requests = intercepted.filter(n => !!n.request).map(n => n.request);
    const responses = intercepted.map(n => n.response).filter(n => !!n);

    if (!requests.find(n => n.uri === '/lnrpc.Lightning/AddInvoice')) {
      fail('Expected add invoice request interception');
    }

    if (!responses.find(n => n.uri === '/lnrpc.Lightning/AddInvoice')) {
      fail('Expected add invoice response interception');
    }

    if (!requests.find(n => n.uri === '/lnrpc.Lightning/GetInfo')) {
      fail('Expected get wallet info request interception');
    }

    if (!responses.find(n => n.uri === '/lnrpc.Lightning/GetInfo')) {
      fail('Expected get wallet info response interception');
    }

    if (!requests.find(n => n.uri === subscribeInvoiceUri)) {
      fail('Expected invoice subscription interception');
    }

    if (!requests.find(n => n.uri === '/lnrpc.Lightning/LookupInvoice')) {
      fail('Expected get invoice interception');
    }

    if (!responses.find(n => n.uri === '/lnrpc.Lightning/LookupInvoice')) {
      fail('Expected get invoice response interception');
    }

    rpcRequestsSub.removeAllListeners();

    {
      const {subscription} = await subscribeToRpcRequests({
        lnd,
        is_intercepting_open_channel_requests: true,
      });

      subscription.on('open_channel_request', async intercepted => {
        await intercepted.accept({});
      });

      try {
        await openChannel({
          lnd,
          local_tokens: 1e6,
          partner_public_key: key,
        });

        fail('ExpectedChannelCannotBeOpened');
      } catch (err) {
        deepEqual(err, [400, 'CannotOpenChannelToOwnNode'], 'RPC req accepted');
      }

      await delay(2500);

      subscription.removeAllListeners();
    }

    try {
      const {subscription} = await subscribeToRpcRequests({
        lnd,
        id: 'stop channel give tokens',
        is_intercepting_open_channel_requests: true,
      });

      subscription.on('open_channel_request', async intercepted => {
        // Stop all open channel requests that gift tokens
        if (!!intercepted.request.give_tokens) {
          await intercepted.reject({message: 'message'});
        } else {
          await intercepted.accept({});
        }
      });

      await asyncRetry({interval, times}, async () => {
        try {
          // Gift some tokens in a channel
          await openChannel({
            lnd,
            base_fee_mtokens: '1',
            fee_rate: 1,
            give_tokens: 1e5,
            local_tokens: 1e6,
            partner_public_key: Buffer.alloc(33, 2).toString('hex'),
          });

          fail('ExpectedChannelRejected');
        } catch (err) {
          const [code, message] = err;

          if (message !== 'FailedToOpenChannel') {
            throw err;
          }

          deepEqual(
            err,
            [503, 'FailedToOpenChannel', {err: 'message'}],
            'Channel open fails to execute'
          );
        }
      });

      await delay(2000);

      subscription.removeAllListeners();
    } catch (err) {
      equal(err, null, 'Expected no error opening channel');
    }

    try {
      const {subscription} = await subscribeToRpcRequests({
        lnd,
        id: 'stop channel close to address',
        is_intercepting_close_channel_requests: true,
      });

      subscription.on('close_channel_request', async intercepted => {
        // Stop all open channel requests that close out to an address
        if (!!intercepted.request.address) {
          deepEqual(intercepted.request.max_tokens_per_vbyte, 10, 'Max fee');

          await intercepted.reject({message: 'message'});
        } else {
          await intercepted.accept({});
        }
      });

      await asyncRetry({interval, times}, async () => {
        try {
          // Attempt a channel close with an address
          await closeChannel({
            lnd,
            address: 'address',
            max_tokens_per_vbyte: 10,
            transaction_id: Buffer.alloc(32).toString('hex'),
            transaction_vout: 0,
          });

          fail('ExpectedChannelCloseRejected');
        } catch (err) {
          const [code, message, raw] = err;

          if (raw.err.details !== 'message') {
            throw err;
          }

          deepEqual(code, 503, 'Close fails with server error');
          deepEqual(message, 'UnexpectedCloseChannelError', 'Close error');
          deepEqual(raw.err.details, 'message', 'Custom message received');
        }
      });

      subscription.removeAllListeners();
    } catch (err) {
      equal(err, null, 'Expected no error');
    }

    {
      const {subscription} = await subscribeToRpcRequests({
        lnd,
        id: 'stop pay via route request',
        is_intercepting_pay_via_routes_requests: true,
      });

      await delay(2000);

      subscription.on('pay_via_route_request', async intercepted => {
        // Stop all route requests that have a non zero fee and pay to own key
        const feeMtokens = intercepted.request.route.fee_mtokens;
        const [finalHop] = intercepted.request.route.hops.reverse();

        if (feeMtokens === '0' && finalHop.public_key === key) {
          await intercepted.reject({message: 'message'});
        } else {
          await intercepted.accept({});
        }
      });

      await asyncRetry({interval, times}, async () => {
        try {
          // Attempt a payment
          await payViaRoutes({
            lnd,
            routes: [{
              fee: 0,
              fee_mtokens: '0',
              hops: [{
                channel: '0x0x1',
                channel_capacity: 1,
                fee: 0,
                fee_mtokens: '0',
                forward: 0,
                forward_mtokens: '1',
                public_key: key,
                timeout: 1,
              }],
              mtokens: '1',
              timeout: 1,
              tokens: 0,
            }],
          });

          fail('ExpectedPayViaRouteRejected');
        } catch (err) {
          const [code, message] = err;

          if (message !== 'UnexpectedErrorWhenPayingViaRoute') {
            throw err;
          }

          equal(code, 503);
          equal(message, 'UnexpectedErrorWhenPayingViaRoute');
        }
      });

      subscription.removeAllListeners();
    }
  });

  await asyncEach(kills, async kill => await kill({}));

  return;
});
