const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getChainTransactions} = require('./../../');
const {getWalletInfo} = require('./../../');

const count = 100;
const defaultFee = 1e3;
const format = 'np2wpkh';
const times = 300;

// Getting chain transactions should list out the chain transactions
test(`Get chain transactions`, async () => {
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
  const transactions = await asyncRetry({times}, async () => {
    const {transactions} = await getChainTransactions({lnd});

    const [tx] = transactions;

    if (!tx.is_confirmed) {
      throw new Error('ExpectedTransactionConfirmed');
    }

    return transactions;
  });

  equal(transactions.length > 1, true, 'Transaction found');

  const [tx] = transactions;

  equal(!!tx.block_id, true, 'Transaction has block id');
  equal(!!tx.confirmation_count, true, 'Transaction confirm count');
  equal(!!tx.confirmation_height, true, 'Transaction confirm height');
  equal(!!tx.created_at, true, 'Transaction record create time');
  equal(tx.description, undefined, 'No tx description');
  equal(tx.fee, undefined, 'No transaction fee');
  equal(!!tx.id, true, 'Transaction id');
  equal(tx.is_confirmed, true, 'Transaction is confirmed');
  equal(tx.is_outgoing, false, 'Transaction is incoming');
  equal(tx.output_addresses.length, 1, 'Tx output address');
  equal(tx.tokens, 5000000000, 'Got coinbase reward tokens');
  equal(!!tx.transaction, true, 'Got transaction hex');

  const onlyBefore = await getChainTransactions({lnd, before: 2});

  equal(onlyBefore.transactions.length < 100, true, 'Got before txs');

  const between = await getChainTransactions({
    lnd,
    after: tx.confirmation_height - 1,
    before: tx.confirmation_height + 1,
  });

  equal(between.transactions.length, [tx].length, 'One transaction');

  await kill({});

  return;
});
