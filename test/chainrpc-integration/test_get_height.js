const asyncRetry = require('async/retry');
const {test} = require('tap');

const {generateBlocks} = require('./../macros');
const {getHeight} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const confirmationCount = 6;

// Get height should return height
test(`Get height`, async ({end, equal, fail}) => {
  const spawned = await spawnLnd({});

  const {generate, kill, lnd} = spawned;

  const startHeight = (await getHeight({lnd})).current_block_height;

  await generate({count: confirmationCount});

  await asyncRetry({}, async () => {
    const endHeight = (await getHeight({lnd})).current_block_height;

    if (endHeight - startHeight < confirmationCount) {
      throw new Error('ExpectedHeightIncreaseReflected');
    }

    equal(endHeight - startHeight >= confirmationCount, true, 'Got height');

    return;
  });

  kill();

  await waitForTermination({lnd});

  return end();
});
