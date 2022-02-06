const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {getInvoice} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {payViaRoutes} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const all = promise => Promise.all(promise);
const capacity = 1e6;
const {ceil} = Math;
const {round} = Math;
const size = 2;

// Paying using multiple paths should execute the payment across paths
test(`Pay with multiple paths`, async ({end, equal, rejects, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await generate({count: 400});

  const channel1 = await setupChannel({
    capacity,
    generate,
    lnd,
    to: target,
  });

  const channel2 = await setupChannel({
    capacity,
    generate,
    lnd,
    to: target,
  });

  const channels = [channel1, channel2];

  const payParts = [
    channel1.local_balance,
    round(channel2.local_balance / channels.length),
  ];

  const tokens = payParts.reduce((sum, n) => sum + n, Number());

  const {request} = await createInvoice({tokens, lnd: target.lnd});

  // Payment should fail with only 1 path
  try {
    await payViaPaymentRequest({lnd, request, max_paths: [channel1].length});
  } catch (err) {
    strictSame(
      err,
      [503, 'PaymentPathfindingFailedToFindPossibleRoute'],
      'No path'
    );
  }

  // Payment should succeed with 2 paths
  try {
    const {paths} = await payViaPaymentRequest({
      lnd,
      request,
      max_paths: [channel1, channel2].length,
    });

    equal(paths.length, [channel1, channel2].length, 'Used multiple paths');
  } catch (err) {
    equal(err, null, 'There is no error');
  }

  const controlInvoice = await createInvoice({
    lnd,
    tokens: channel1.capacity,
  });

  const parsed = parsePaymentRequest({request: controlInvoice.request});

  const route1 = await getRouteToDestination({
    cltv_delta: parsed.cltv_delta,
    destination: parsed.destination,
    features: parsed.features,
    lnd: target.lnd,
    outgoing_channel: channel1.id,
    payment: parsed.payment,
    tokens: ceil(parsed.tokens / channels.length),
    total_mtokens: parsed.mtokens,
  });

  const route2 = await getRouteToDestination({
    cltv_delta: parsed.cltv_delta,
    destination: parsed.destination,
    features: parsed.features,
    lnd: target.lnd,
    outgoing_channel: channel2.id,
    payment: parsed.payment,
    tokens: ceil(parsed.tokens / channels.length),
    total_mtokens: parsed.mtokens,
  });

  // Pay using routes. Multiple channels must be used to avoid tempChanFail
  try {
    const routes = [route1.route, route2.route];

    const payRoutes = routes.map(route => {
      return payViaRoutes({
        id: parsed.id,
        lnd: target.lnd,
        routes: [route],
      });
    });

    const [{secret}] = await all(payRoutes);

    equal(secret, controlInvoice.secret, 'Paid via custom routes');
  } catch (err) {
    equal(err, null, 'Not expected any error');
  }

  await kill({});

  return end();
});
