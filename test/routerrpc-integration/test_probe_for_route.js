const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {deleteForwardingReputations} = require('./../../');
const {getChannels} = require('./../../');
const {payViaRoutes} = require('./../../');
const {probeForRoute} = require('./../../');
const {setupChannel} = require('./../macros');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const tokens = 1e6 / 2;

// Probing for a route should return a route
test('Probe for route', async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  await setupChannel({
    lnd,
    capacity: channelCapacityTokens + channelCapacityTokens,
    generate: cluster.generate,
    to: cluster.target,
  });

  await setupChannel({
    capacity: channelCapacityTokens,
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    give: Math.round(channelCapacityTokens / 2),
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

  await delay(1000);

  try {
    await probeForRoute({
      lnd,
      destination: cluster.remote_node_public_key,
      is_ignoring_past_failures: true,
      tokens: invoice.tokens,
    });
  } catch (err) {
    const [code, message, {failure}] = err;

    equal(code, 503, 'Failed to find route');
    equal(message, 'RoutingFailure', 'Hit a routing failure');
    equal(failure.reason, 'TemporaryChannelFailure', 'Temporary failure');
  }

  // Create a new channel to increase total edge liquidity
  await setupChannel({
    capacity: channelCapacityTokens,
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    to: cluster.remote,
  });

  await deleteForwardingReputations({lnd});

  try {
    const {route} = await probeForRoute({
      lnd,
      destination: cluster.remote.public_key,
      payment: invoice.payment,
      tokens: invoice.tokens,
      total_mtokens: !!invoice.payment ? invoice.mtokens : undefined,
    });

    if (!route) {
      throw new Error('ExpectedRouteFromProbe');
    }

    equal(route.fee, 1, 'Found route fee');
    equal(route.fee_mtokens, '1500', 'Found route fee mtokens');
    deepIs(route.hops.length, 2, 'Found route hops returned');
    equal(route.mtokens, '500001500', 'Found route mtokens');
    equal(route.timeout, 546, 'Found route timeout');
    equal(route.tokens, 500001, 'Found route tokens');

    const {secret} = await payViaRoutes({
      lnd,
      id: invoice.id,
      routes: [route],
    });

    equal(secret, invoice.secret, 'Route works');
  } catch (err) {
    equal(err, null, 'No error when probing for route');
  }

  await cluster.kill({});

  return end();
});
