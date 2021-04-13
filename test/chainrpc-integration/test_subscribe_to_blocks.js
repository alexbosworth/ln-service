const EventEmitter = require('events');

const asyncRetry = require('async/retry');
const {test} = require('tap');

const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const {getHeight} = require('./../../');
const {spawnLnd} = require('./../macros');
const {subscribeToBlocks} = require('./../../');
const {waitForTermination} = require('./../macros');

const confirmationCount = 6;
const interval = 200;
const times = 400;

// Subscribers to blocks should receive block notifications
test(`Subscribe to blocks`, async ({end, equal, fail}) => {
  const spawned = await spawnLnd({});

  const {kill, lnd} = spawned;

  const blocks = [];

  // Wait for chainrpc to be active
  await asyncRetry({interval, times}, async () => {
    const height = (await getHeight({lnd})).current_block_height;

    if (!height) {
      throw new Error('ExpectedCurrentHeight');
    }

    return;
  });

  const sub = subscribeToBlocks({lnd});
  const startHeight = (await getHeight({lnd})).current_block_height;

  sub.on('block', async data => blocks.push(data));
  sub.on('error', err => {});

  await spawned.generate({count: confirmationCount});

  await asyncRetry({interval, times}, async () => {
    if (blocks.length < confirmationCount) {
      throw new Error('ExpectedAdditionalBlocks');
    }
  });

  blocks.forEach(({height, id}) => {
    equal(!!height, true, 'Got expected block height');
    equal(id.length, 64, 'Got expected block hash length');
    return;
  });

  kill();

  await waitForTermination({lnd});

  return end();

  return;
});
