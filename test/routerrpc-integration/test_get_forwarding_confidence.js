const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {getChannels} = require('./../../');
const {getForwardingConfidence} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {probeForRoute} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const channelCapacityTokens = 1e6;
const tokens = 1e6 / 2;

// Getting forwarding confidence should return confidence score
test('Get forwarding confidence', async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  await setupChannel({
    lnd,
    capacity: channelCapacityTokens * 2,
    generate: cluster.generate,
    to: cluster.target,
  });

  try {
    await getForwardingConfidence({
      lnd,
      from: cluster.target.public_key,
      mtokens: '1',
      to: cluster.remote.public_key,
    });
  } catch (err) {
    const [, code] = err;

    equal(code, 'QueryProbabilityNotImplemented', 'Not implemented error');

    await cluster.kill({});

    return end();
  }

  const [controlChannel] = (await getChannels({lnd})).channels;

  await setupChannel({
    capacity: channelCapacityTokens,
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

  try {
    await probeForRoute({
      destination,
      lnd,
      tokens,
      is_ignoring_past_failures: true,
    });
  } catch (err) {}

  const {nodes} = await getForwardingReputations({lnd});

  equal(nodes.length > 0, true, 'Reputation should be generated');

  const [{hops}] = routes;

  const [from, to] = hops;

  const successHop = await getForwardingConfidence({
    lnd,
    from: cluster.control.public_key,
    mtokens: '1',
    to: cluster.target.public_key,
  });

  equal(successHop.confidence, 950000, 'High confidence in A -> B');

  const failedHop = await getForwardingConfidence({
    lnd,
    from: cluster.target.public_key,
    mtokens: from.forward_mtokens,
    to: cluster.remote.public_key,
  });

  equal(failedHop.confidence < 1e3, true, 'Low confidence in B -> C');

  await cluster.kill({});

  return end();
});
