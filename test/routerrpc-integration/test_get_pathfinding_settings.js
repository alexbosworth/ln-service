const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getPathfindingSettings} = require('./../../');

// Getting pathfinding settings should return pathfinding configuration
test(`Get pathfinding settings`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  const config = await getPathfindingSettings({lnd});

  const expected = {
    baseline_success_rate: 600000,
    max_payment_records: 1000,
    node_ignore_rate: 500000,
    penalty_half_life_ms: 3600000,
  };

  deepEqual(config, expected, 'Got expected pathfinding config');

  await kill({});

  return;
});
