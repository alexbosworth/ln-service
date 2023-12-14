const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getChainTransaction} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getWalletInfo} = require('./../../');

const count = 100;
const defaultFee = 1e3;
const format = 'np2wpkh';
const times = 300;

// Getting a chain transaction should return the chain transactions
test(`Get chain transaction`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  // Generate some funds for LND
  await generate({count});

  await asyncRetry({interval: 10, times: 6000}, async () => {
    const wallet = await getWalletInfo({lnd});

    if (!wallet.is_synced_to_chain) {
      throw new Error('ExpectedWalletSyncedToChain');
    }

    await generate({});

    if (wallet.current_block_height < count + 1) {
      throw new Error('ExpectedFullySyncedToChain');
    }
  });

  // Wait for generation to be over
  await asyncRetry({times}, async () => {
    const {transactions} = await getChainTransactions({lnd});

    const [tx] = transactions;

    if (!tx.is_confirmed) {
      throw new Error('ExpectedTransactionConfirmed');
    }

    return;
  });

  const {transactions} = await getChainTransactions({lnd});

  const [tx] = transactions;

  try {
    const singleTx = await getChainTransaction({lnd, id: tx.id});

    await kill({});

    deepEqual(singleTx, tx, 'Transactions are the same');
  } catch (err) {
    await kill({});

    deepEqual(err, [501, 'GetChainTransactionMethodNotSupported'], 'Invalid');
  }

  return;
});
