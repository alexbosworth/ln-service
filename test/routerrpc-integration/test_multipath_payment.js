const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {getChannelBalance} = require('./../../');
const {getChannels} = require('./../../');
const {getInvoice} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {payViaRoutes} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const all = promise => Promise.all(promise);
const capacity = 1e6;
const {ceil} = Math;
const interval = 10;
const maturity = 100;
const {round} = Math;
const size = 2;
const times = 2000;

// Paying using multiple paths should execute the payment across paths
test(`Pay with multiple paths`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await generate({count: maturity});

  const channel1 = await setupChannel({
    capacity,
    generate,
    lnd,
    hidden: true,
    to: target,
  });

  await asyncRetry({interval, times}, async () => {
    const {channels} = await getChannels({lnd});

    await generate({});

    if (!channels.length) {
      throw new Error('ExpectedChannelCreated');
    }
  });

  const channel2 = await setupChannel({
    capacity,
    generate,
    lnd,
    hidden: true,
    to: target,
  });

  await asyncRetry({interval, times}, async () => {
    const {channels} = await getChannels({lnd, is_active: true});

    await generate({});

    if (channels.length < size) {
      throw new Error('ExpectedSecondChannelCreated');
    }

    const balance = await getChannelBalance({lnd});

    if (balance.channel_balance < capacity) {
      throw new Error('ExpectedChannelBalancePresent');
    }
  });

  const channels = [channel1, channel2];

  const payParts = [
    channel1.local_balance,
    round(channel2.local_balance / channels.length),
  ];

  const tokens = payParts.reduce((sum, n) => sum + n, Number());

  const {request} = await createInvoice({tokens, lnd: target.lnd});

  // Payment should fail with only 1 path
  await asyncRetry({interval, times}, async () => {
    try {
      await payViaPaymentRequest({lnd, request, max_paths: [channel1].length});
    } catch (err) {
      const [, message] = err;

      if (message !== 'PaymentPathfindingFailedToFindPossibleRoute') {
        throw err;
      }

      deepEqual(
        err,
        [503, 'PaymentPathfindingFailedToFindPossibleRoute'],
        'No path'
      );
    }
  });

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

  const route1 = await asyncRetry({interval, times}, async () => {
    return await getRouteToDestination({
      cltv_delta: parsed.cltv_delta,
      destination: parsed.destination,
      features: parsed.features,
      lnd: target.lnd,
      outgoing_channel: channel1.id,
      payment: parsed.payment,
      tokens: ceil(parsed.tokens / channels.length),
      total_mtokens: parsed.mtokens,
    });
  });

  const route2 = await asyncRetry({interval, times}, async () => {
    return await getRouteToDestination({
      cltv_delta: parsed.cltv_delta,
      destination: parsed.destination,
      features: parsed.features,
      lnd: target.lnd,
      outgoing_channel: channel2.id,
      payment: parsed.payment,
      tokens: ceil(parsed.tokens / channels.length),
      total_mtokens: parsed.mtokens,
    });
  });

  // Pay using routes. Multiple channels must be used to avoid tempChanFail
  try {
    const routes = [route1.route, route2.route];

    const payRoutes = routes.map(route => {
      return asyncRetry({interval, times}, async () => {
        return payViaRoutes({
          id: parsed.id,
          lnd: target.lnd,
          routes: [route],
        });
      });
    });

    const [{secret}] = await all(payRoutes);

    equal(secret, controlInvoice.secret, 'Paid via custom routes');
  } catch (err) {
    equal(err, null, 'Not expected any error');
  }

  await kill({});

  return;
});
