const asyncRetry = require('async/retry');
const {test} = require('tap');

const {getPathfindingSettings} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

// Getting pathfinding settings should return pathfinding configuration
test(`Get pathfinding settings`, async ({end, equal, fail, strictSame}) => {
  const node = await asyncRetry({}, async () => await spawnLnd({}));

  const {kill} = node;
  const {lnd} = node;

  try {
    await getPathfindingSettings({lnd});
  } catch (err) {
    // Get pathfinding settings is not supported in LND 0.12.1 and below
    if (err[0] === 501) {
      kill();

      await waitForTermination({lnd});

      return end();
    }
  }

  const config = await getPathfindingSettings({lnd});

  const expected = {
    baseline_success_rate: 600000,
    max_payment_records: 1000,
    node_ignore_rate: 500000,
    penalty_half_life_ms: 3600000,
  };

  strictSame(config, expected, 'Got expected pathfinding config');

  kill();

  await waitForTermination({lnd});

  return end();
});
