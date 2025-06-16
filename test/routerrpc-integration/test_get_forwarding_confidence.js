const {equal} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {getChannels} = require('./../../');
const {getForwardingConfidence} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {probeForRoute} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const channelCapacityTokens = 1e6;
const size = 3;
const mtokens = '1000';
const tokens = 1e6 / 2;

// Getting forwarding confidence should return confidence score
test('Get forwarding confidence', async () => {
  const cluster = await spawnLightningCluster({size});

  const [{generate, id, lnd}, target, remote] = cluster.nodes;

  // Create a channel from the control to the target node
  await setupChannel({
    generate,
    lnd,
    capacity: channelCapacityTokens * 2,
    to: target,
  });

  const [controlChannel] = (await getChannels({lnd})).channels;

  await setupChannel({
    capacity: channelCapacityTokens,
    generate: target.generate,
    give_tokens: Math.round(channelCapacityTokens / 2),
    lnd: target.lnd,
    to: remote,
  });

  await addPeer({lnd, public_key: remote.id, socket: remote.socket});

  const destination = remote.id;

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
    mtokens,
    from: id,
    to: target.id,
  });

  equal(successHop.confidence, 950000, 'High confidence in A -> B');

  const failedHop = await getForwardingConfidence({
    lnd,
    from: target.id,
    mtokens: from.forward_mtokens,
    to: remote.id,
  });

  equal(failedHop.confidence < 1e3, true, 'Low confidence in B -> C');

  await cluster.kill({});

  return;
});
