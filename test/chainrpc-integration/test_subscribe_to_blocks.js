const EventEmitter = require('node:events');
const {once} = require('node:events');
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {getHeight} = require('./../../');
const {getChainBalance} = require('./../../');
const {getWalletInfo} = require('./../../');
const {subscribeToBlocks} = require('./../../');

const confirmationCount = 6;
const interval = 50;
const race = promises => Promise.race(promises);
const times = 4000;

// Subscribers to blocks should receive block notifications
test(`Subscribe to blocks`, async () => {
  const blocks = [];
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  // Try to make sure that the chain notifier RPC is ready
  await asyncRetry({interval, times}, async () => {
    const wallet = await getWalletInfo({lnd});

    await generate({});

    if (!wallet.is_synced_to_chain) {
      throw new Error('NotSyncedToChain');
    }
  });

  const gotHeight = await asyncRetry({interval, times}, async () => {
    const subBlocks = subscribeToBlocks({lnd});

    const [event] = await race([
      once(subBlocks, 'block'),
      once(subBlocks, 'error'),
    ]);

    if (!event.height) {
      throw new Error('ExpectedBlockEvent');
    }

    return !!event.height;
  });

  strictEqual(gotHeight, true, 'Got the block height');

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
      strictEqual(!!height, true, 'Got expected block height');
      strictEqual(id.length, 64, 'Got expected block hash length');
      return;
    });
  } catch (err) {
    strictEqual(err, null, 'Expected no error');
  } finally {
    await kill({});

    return;
  }
});
