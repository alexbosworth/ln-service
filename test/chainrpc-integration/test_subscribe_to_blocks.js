const EventEmitter = require('events');
const {once} = require('events');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const {getHeight} = require('./../../');
const {getChainBalance} = require('./../../');
const {subscribeToBlocks} = require('./../../');
const {waitForTermination} = require('./../macros');

const confirmationCount = 6;
const interval = 1;
const race = promises => Promise.race(promises);
const times = 4000;

// Subscribers to blocks should receive block notifications
test(`Subscribe to blocks`, async ({end, equal, fail}) => {
  const blocks = [];
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  await asyncRetry({interval, times}, async () => {
    const subBlocks = subscribeToBlocks({lnd});

    const [event] = await race([
      once(subBlocks, 'block'),
      once(subBlocks, 'error'),
    ]);

    if (!event.height) {
      throw new Error('ExpectedBlockEvent');
    }
  });

  try {
    // Wait for chainrpc to be active
    await asyncRetry({interval, times}, async () => {
      if (!!(await getChainBalance({lnd})).chain_balance) {
        return;
      }

      await generate({});

      await getHeight({lnd});

      throw new Error('ExpectedChainBalance');
    });

    const sub = subscribeToBlocks({lnd});
    const startHeight = (await getHeight({lnd})).current_block_height;

    sub.on('block', data => blocks.push(data));
    sub.on('error', err => {});

    const {address} = await createChainAddress({lnd});

    await asyncRetry({interval, times}, async () => {
      await generate({});

      if (blocks.length < confirmationCount) {
        throw new Error('ExpectedAdditionalBlocks');
      }
    });

    blocks.forEach(({height, id}) => {
      equal(!!height, true, 'Got expected block height');
      equal(id.length, 64, 'Got expected block hash length');
      return;
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});

    return end();
  }
});
