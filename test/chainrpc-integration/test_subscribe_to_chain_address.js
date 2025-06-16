const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getHeight} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {subscribeToChainAddress} = require('./../../');

const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const format = 'np2wpkh';
const interval = 1;
const times = 1500;
const tokens = 1e8;

// Subscribing to chain transaction confirmations should trigger events
test(`Subscribe to chain transactions`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{chain, generate, lnd}] = nodes;

  // Wait for chainrpc to be active
  await asyncRetry({interval, times}, async () => {
    if (!!(await getChainBalance({lnd})).chain_balance) {
      return;
    }

    await generate({});

    await getHeight({lnd});

    throw new Error('ExpectedChainBalance');
  });

  let firstConf;
  const {address} = await createChainAddress({format, lnd});
  const startHeight = (await getHeight({lnd})).current_block_height;

  await asyncRetry({interval, times}, async () => {
    const sub = subscribeToChainAddress({
      lnd,
      min_height: startHeight,
      p2sh_address: address,
    });

    sub.on('confirmation', conf => firstConf = conf);
    sub.on('error', err => {});

    await generate({count});

    await sendToChainAddress({lnd, address, tokens});

    const {transactions} = await getChainTransactions({lnd});

    const [{transaction}] = transactions
      .filter(n => !n.is_confirmed)
      .filter(n => !!n.is_outgoing);

    if (!transaction) {
      throw new Error('ExpectedTransactionInSubscribeToChainAddressResult');
    }

    // Wait for generation to be over
    await asyncRetry({interval, times}, async () => {
      await generate({});

      if (!firstConf) {
        throw new Error('ExpectedSubscribeToChainAddressSeesConf');
      }

      strictEqual(firstConf.block.length, 64, 'Confirmation hash returned');
      strictEqual(firstConf.height >= 102, true, 'Got confirmation height');
      strictEqual(firstConf.transaction, transaction, 'Confirmation raw tx');

      return;
    });

    let secondConf;

    const sub2 = subscribeToChainAddress({
      lnd,
      min_confirmations: 6,
      min_height: startHeight,
      p2sh_address: address,
    });

    sub2.on('error', () => {});

    sub2.on('confirmation', conf => secondConf = conf);

    // Wait for generation to be over
    await asyncRetry({interval, times}, async () => {
      await generate({});

      if (!secondConf) {
        throw new Error('ExpectedSubscribeToChainAddressSeesConfirmation');
      }

      strictEqual(secondConf.block.length, 64, 'Confirmation hash returned');
      strictEqual(secondConf.height >= 102, true, 'Confirmation block height');
      strictEqual(secondConf.transaction, transaction, '2nd conf tx returned');

      return;
    });

    [sub, sub2].forEach(n => n.removeAllListeners());
  });

  await kill({});

  return;
});
