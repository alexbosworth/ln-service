const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {getRouteConfidence} = require('./../../');
const {probeForRoute} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const channelCapacityTokens = 1e6;
const tokens = 1e6 / 2;

// Getting route confidence should return confidence in a route
test('Get route confidence', async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  await setupChannel({
    lnd,
    capacity: channelCapacityTokens * 2,
    generate: cluster.generate,
    to: cluster.target,
  });

  await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    give: Math.round(channelCapacityTokens / 2),
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket
  });

  const destination = cluster.remote.public_key;

  // Allow time for graph sync to complete
  const {routes} = await waitForRoute({destination, lnd, tokens});

  // Run into a failure to inform future pathfinding
  try {
    await probeForRoute({destination, lnd, tokens});
  } catch (err) {}

  const {nodes} = await getForwardingReputations({lnd});

  const [{hops}] = routes;

  const odds = (await getRouteConfidence({lnd, hops})).confidence;

  equal((odds / 1e6) < 0.1, true, 'Due to fail, odds of success are low');

  await cluster.kill({});

  return end();
});
