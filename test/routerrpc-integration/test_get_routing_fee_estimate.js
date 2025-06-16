const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {getRoutingFeeEstimate} = require('./../../');
const {getWalletInfo} = require('./../../');
const {probeForRoute} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const channelCapacityTokens = 1e6;
const interval = 50;
const size = 3;
const times = 9000;
const tokens = 1e6 / 2;

// Getting routing fee estimate should return required fee for a route
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
      capacity: channelCapacityTokens,
      to: target,
    });

    // Create a channel from target to remote
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

    const {request} = await createInvoice({tokens, lnd: remote.lnd});

    const height = (await getWalletInfo({lnd})).current_block_height;

    const estimate = await getRoutingFeeEstimate({lnd, request});

    equal(estimate.fee_mtokens, '1500', 'Got fee');
    equal(estimate.timeout - height, 83, 'Got timeout');
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return;
});
