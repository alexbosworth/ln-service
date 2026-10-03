const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {getChannels} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {isDestinationPayable} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {payViaPaymentDetails} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {probeForRoute} = require('./../../');
const {subscribeToProbeForRoute} = require('./../../');

const capacity = 1e6;
const channelsCount = 3;
const interval = 10;
const maturity = 100;
const size = 2;
const times = 2000;
const tokens = 1e4;

// Probe for a route using the subscription method
const subscribeProbe = args => new Promise((resolve, reject) => {
  const sub = subscribeToProbeForRoute(args);

  let route;

  sub.on('end', () => !route ? reject([503, 'NoProbeRoute']) : resolve(route));
  sub.on('error', err => reject(err));
  sub.on('probe_success', res => route = res.route);
});

// Outgoing channel constraints should restrict the first hop of paths
test(`Outgoing channels constraints`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  try {
    await generate({count: maturity});

    // Open multiple parallel channels so there is a choice of first hop
    const channels = [];

    for (let i = 0; i < channelsCount; i++) {
      channels.push(await setupChannel({capacity, generate, lnd, to: target}));
    }

    const ids = channels.map(n => n.id);

    await asyncRetry({interval, times}, async () => {
      const active = await getChannels({lnd, is_active: true});

      if (active.channels.length < channelsCount) {
        await generate({});

        throw new Error('ExpectedAllChannelsActive');
      }
    });

    // Constraining to each single channel should always use that channel
    for (const id of ids) {
      const {route} = await asyncRetry({interval, times}, async () => {
        return await getRouteToDestination({
          lnd,
          tokens,
          destination: target.id,
          outgoing_channels: [id],
        });
      });

      const [firstHop] = route.hops;

      equal(firstHop.channel, id, 'Route uses only allowed outgoing channel');
    }

    // Constraining to a set of channels should use a channel in the set
    {
      const allowed = ids.slice(1);

      const {route} = await getRouteToDestination({
        lnd,
        tokens,
        destination: target.id,
        outgoing_channels: allowed,
      });

      const [firstHop] = route.hops;

      equal(allowed.includes(firstHop.channel), true, 'Route uses allowed set');
    }

    // Multiple outgoing channels take precedence over a single channel
    {
      const [singleChannel, ...multipleChannels] = ids;

      const {route} = await getRouteToDestination({
        lnd,
        tokens,
        destination: target.id,
        outgoing_channel: singleChannel,
        outgoing_channels: multipleChannels,
      });

      const [firstHop] = route.hops;

      equal(firstHop.channel !== singleChannel, true, 'Multiple has priority');
      equal(multipleChannels.includes(firstHop.channel), true, 'Uses multi');
    }

    // Checking payability through an outgoing channel should be successful
    for (const id of ids) {
      const payable = await isDestinationPayable({
        lnd,
        tokens,
        destination: target.id,
        outgoing_channels: [id],
      });

      deepEqual(payable, {is_payable: true}, 'Payable via outgoing channel');
    }

    // Probing should only use the specified outgoing channel
    for (const id of ids) {
      const {route} = await probeForRoute({
        lnd,
        tokens,
        destination: target.id,
        outgoing_channels: [id],
      });

      const [firstHop] = route.hops;

      equal(firstHop.channel, id, 'Probe route uses allowed outgoing channel');
    }

    // Probing via subscription should only use the specified outgoing channel
    for (const id of ids) {
      const route = await subscribeProbe({
        lnd,
        tokens,
        destination: target.id,
        outgoing_channels: [id],
      });

      const [firstHop] = route.hops;

      equal(firstHop.channel, id, 'Sub probe uses allowed outgoing channel');
    }

    // Paying via details should pay out of the specified outgoing channel
    for (const id of ids) {
      const invoice = await createInvoice({tokens, lnd: target.lnd});

      const parsed = parsePaymentRequest({request: invoice.request});

      const paid = await payViaPaymentDetails({
        lnd,
        cltv_delta: parsed.cltv_delta,
        destination: parsed.destination,
        features: parsed.features,
        id: parsed.id,
        outgoing_channels: [id],
        payment: parsed.payment,
        tokens: parsed.tokens,
      });

      equal(paid.secret, invoice.secret, 'Paid via payment details');

      paid.paths.forEach(path => {
        const [firstHop] = path.hops;

        equal(firstHop.channel, id, 'Payment details uses outgoing channel');
      });
    }

    // Paying via request should pay out of the specified outgoing channels
    {
      const allowed = ids.slice(0, 2);
      const invoice = await createInvoice({tokens, lnd: target.lnd});

      const paid = await payViaPaymentRequest({
        lnd,
        outgoing_channels: allowed,
        request: invoice.request,
      });

      equal(paid.secret, invoice.secret, 'Paid via payment request');

      paid.paths.forEach(path => {
        const [firstHop] = path.hops;

        equal(allowed.includes(firstHop.channel), true, 'Request uses allowed');
      });
    }

    // The payments should be reflected in the outgoing channel balances
    const {channels: updated} = await getChannels({lnd});

    channels.forEach(channel => {
      const {local_balance} = updated.find(n => n.id === channel.id);

      const paidOut = channel.local_balance - local_balance;

      equal(paidOut >= tokens, true, 'Outgoing channel balance was paid out');
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return;
});
