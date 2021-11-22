const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getHeight} = require('./../../');

const confirmationCount = 6;
const times = 100;

// Get height should return height
test(`Get height`, async ({end, equal, fail}) => {
  const {nodes} = await spawnLightningCluster({});

  const [{chain, generate, kill, lnd}] = nodes;

  const startHeight = (await getHeight({lnd})).current_block_height;

  await asyncRetry({times}, async () => {
    await generate({});

    const endHeight = (await getHeight({lnd})).current_block_height;

    if (endHeight - startHeight < confirmationCount) {
      throw new Error('ExpectedHeightIncreaseReflected');
    }

    equal(endHeight - startHeight >= confirmationCount, true, 'Got height');

    return;
  });

  await kill({});

  return end();
});
