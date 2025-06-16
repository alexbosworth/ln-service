const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {getRouteConfidence} = require('./../../');
const {getWalletInfo} = require('./../../');
const {probeForRoute} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const channelCapacityTokens = 1e6;
const interval = 50;
const size = 3;
const times = 5000;
const tokens = 1e6 / 2;

// Getting route confidence should return confidence in a route
test('Get route confidence', async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  await asyncRetry({interval, times}, async () => {
    const wallet = await getWalletInfo({lnd});

    await generate({});

    if (!wallet.is_synced_to_chain) {
      throw new Error('NotSyncedToChain');
    }
  });

  try {
    // Create a channel from the control to the target node
    await setupChannel({
      generate,
      lnd,
      capacity: channelCapacityTokens * 2,
      to: target,
    });

    // Create a too-small channel from target to remote
    await setupChannel({
      generate: target.generate,
      give: Math.round(channelCapacityTokens / 2),
      lnd: target.lnd,
      to: remote,
    });

    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    const destination = remote.id;

    // Allow time for graph sync to complete
    const {routes} = await waitForRoute({destination, lnd, tokens});

    // Run into a failure to inform future pathfinding
    try {
      await probeForRoute({destination, lnd, tokens});
    } catch (err) {}

    const [{hops}] = routes;

    const {confidence} = await getRouteConfidence({lnd, hops});

    equal((confidence / 1e6) < 0.1, true, 'Due to fail, odds of success low');
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return;
});
