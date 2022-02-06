const {randomBytes} = require('crypto');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getInvoice} = require('./../../');
const {getNetworkGraph} = require('./../../');
const {getRouteThroughHops} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {getWalletInfo} = require('./../../');
const {payViaRoutes} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const confirmationCount = 6;
const flatten = arr => [].concat(...arr);
const interval = 10;
const maturity = 100;
const messages = [{type: '1000000', value: '01'}];
const size = 3;
const times = 1000;
const tlvOnionBit = 14;
const tokens = 100;

// Getting a route through hops should result in a route through specified hops
test(`Get route through hops`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  await target.generate({count: maturity});

  const controlToTargetChan = await setupChannel({generate, lnd, to: target});

  const targetToRemoteChan = await setupChannel({
    generate: target.generate,
    lnd: target.lnd,
    to: remote,
  });

  await target.generate({count: confirmationCount});

  await asyncRetry({interval, times}, async () => {
    const wallet = await getWalletInfo({lnd: remote.lnd});

    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    if (!wallet.is_synced_to_chain) {
      throw new Error('ExpectedWalletSyncedToChain');
    }
  });

  await asyncRetry({interval, times}, async () => {
    const {channels, nodes} = await getNetworkGraph({lnd});

    const limitedFeatures = nodes.find(node => {
      return !node.features.find(n => n.bit === tlvOnionBit);
    });

    const policies = flatten(channels.map(n => n.policies));

    const cltvDeltas = policies.map(n => n.cltv_delta);

    if (!!cltvDeltas.filter(n => !n).length) {
      throw new Error('ExpectedAllChannelPolicies');
    }

    if (!!limitedFeatures) {
      throw new Error('NetworkGraphSyncIncomplete');
    }
  });

  const invoice = await createInvoice({tokens, lnd: remote.lnd});

  const {id} = invoice;
  const {request} = invoice;

  const decodedRequest = await decodePaymentRequest({lnd, request});

  await waitForRoute({lnd, destination: remote.id, tokens: invoice.tokens});

  const {route} = await asyncRetry({interval, times}, async () => {
    return await getRouteToDestination({
      lnd,
      cltv_delta: decodedRequest.cltv_delta,
      destination: decodedRequest.destination,
      tokens: invoice.tokens,
    });
  });

  const res = await asyncRetry({interval, times}, async () => {
    return await getRouteThroughHops({
      lnd,
      messages,
      cltv_delta: decodedRequest.cltv_delta + 6,
      mtokens: (BigInt(invoice.tokens) * BigInt(1e3)).toString(),
      payment: decodedRequest.payment,
      public_keys: route.hops.map(n => n.public_key),
      total_mtokens: invoice.mtokens,
    });
  });

  await payViaRoutes({lnd, id: invoice.id, routes: [res.route]});

  const got = await getInvoice({lnd: remote.lnd, id: invoice.id});

  delete res.route.confidence;
  delete route.confidence;

  route.messages = messages;
  route.payment = decodedRequest.payment;
  route.total_mtokens = decodedRequest.mtokens;

  strictSame(res.route, route, 'Constructed route to destination');

  const {payments} = got;

  const [payment] = payments;

  equal(payment.total_mtokens, invoice.mtokens, 'Got MPP total mtokens');

  strictSame(payment.messages, route.messages, 'Remote got TLV messages');

  await kill({});

  return end();
});
