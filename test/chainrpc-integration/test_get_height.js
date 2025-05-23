const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getHeight} = require('./../../');

const confirmationCount = 6;
const interval = 100;
const times = 100;

// Get height should return height
test(`Get height`, async () => {
  const {nodes} = await spawnLightningCluster({});

  const [{chain, generate, kill, lnd}] = nodes;

  const startHeight = (await getHeight({lnd})).current_block_height;

  await asyncRetry({interval, times}, async () => {
    await generate({});

    const endHeight = (await getHeight({lnd})).current_block_height;

    if (endHeight - startHeight < confirmationCount) {
      throw new Error('ExpectedHeightIncreaseReflected');
    }

    strictEqual(
      endHeight - startHeight >= confirmationCount,
      true,
      'Got height'
    );

    return;
  });

  await kill({});

  return;
});
