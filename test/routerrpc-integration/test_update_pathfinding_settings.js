const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getPathfindingSettings} = require('./../../');
const {updatePathfindingSettings} = require('./../../');

// Updating pathfinding settings should update the pathfinding configuration
test(`Get pathfinding settings`, async ({end, equal, fail, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  try {
    await getPathfindingSettings({lnd});
  } catch (err) {
    // Get pathfinding settings is not supported in LND 0.12.1 and below
    if (err.slice().shift() === 501) {
      await kill({});

      return end();
    }
  }

  // Update all configuration values
  {
    await updatePathfindingSettings({
      lnd,
      baseline_success_rate: 70000,
      max_payment_records: 100,
      node_ignore_rate: 7000,
      penalty_half_life_ms: 460000,
    });

    const config = await getPathfindingSettings({lnd});

    const expected = {
      baseline_success_rate: 70000,
      max_payment_records: 100,
      node_ignore_rate: 7000,
      penalty_half_life_ms: 460000,
    };

    strictSame(config, expected, 'Got expected pathfinding config');
  }

  // Update only a single value
  {
    await updatePathfindingSettings({
      lnd,
      max_payment_records: 1e6,
    });

    const config = await getPathfindingSettings({lnd});

    const expected = {
      baseline_success_rate: 70000,
      max_payment_records: 1e6,
      node_ignore_rate: 7000,
      penalty_half_life_ms: 460000,
    };

    strictSame(config, expected, 'Update can change singular values');
  }

  await kill({});

  return end();
});
