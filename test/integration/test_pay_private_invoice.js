const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {cancelHodlInvoice} = require('./../../');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getChannel} = require('./../../');
const {getInvoice} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {pay} = require('./../../');
const {removePeer} = require('./../../');

const interval = 10;
const size = 3;
const times = 1000;
const tokens = 100;

// Paying a private invoice should settle the invoice
test(`Pay private invoice`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  try {
    const [{generate, lnd}, target, remote] = nodes;

    await asyncRetry({interval, times}, async () => {
      const wallet = await getWalletInfo({lnd});

      await generate({});

      if (!wallet.is_synced_to_chain) {
        throw new Error('NotSyncedToChain');
      }
    });

    const channel = await setupChannel({generate, lnd, to: target});

    const remoteChannel = await setupChannel({
      generate: target.generate,
      is_private: true,
      lnd: target.lnd,
      to: remote,
    });

    const invoice = await asyncRetry({interval, times}, async () => {
      await generate({});

      const invoice = await createInvoice({
        tokens,
        is_including_private_channels: true,
        lnd: remote.lnd,
      });

      const {routes} = parsePaymentRequest({request: invoice.request});

      // Wait for private routes to get picked up
      if (!routes) {
        await cancelHodlInvoice({id: invoice.id, lnd: remote.lnd});

        throw new Error('ExpectedRouteForInvoice');
      }

      return invoice;
    });

    const {id} = invoice;
    const {request} = invoice;

    const decodedRequest = await decodePaymentRequest({lnd, request});

    const route = await asyncRetry({interval, times}, async () => {
      await generate({});

      const {route} = await getRouteToDestination({
        lnd,
        cltv_delta: decodedRequest.cltv_delta,
        destination: decodedRequest.destination,
        payment: invoice.payment,
        routes: decodedRequest.routes,
        tokens: invoice.tokens,
        total_mtokens: !!invoice.payment ? invoice.mtokens : undefined,
      });

      if (!route) {
        throw new Error('ExpectedRouteToDestination');
      }

      return route;
    });

    const payment = await pay({lnd, path: {id, routes: [route]}});

    const paidInvoice = await getInvoice({id, lnd: remote.lnd});

    strictEqual(paidInvoice.secret, invoice.secret, 'Paying got secret');
    strictEqual(paidInvoice.is_confirmed, true, 'Private invoice is paid');
  } catch (err) {
    strictEqual(err, null, 'Expected no error paying invoice');
  }

  await kill({});

  return;
});
