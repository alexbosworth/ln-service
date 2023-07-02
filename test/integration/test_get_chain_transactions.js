const {strictEqual} = require('node:assert').strict;
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

  strictEqual(transactions.length > 1, true, 'Transaction found');

  const [tx] = transactions;

  strictEqual(!!tx.block_id, true, 'Transaction has block id');
  strictEqual(!!tx.confirmation_count, true, 'Transaction confirm count');
  strictEqual(!!tx.confirmation_height, true, 'Transaction confirm height');
  strictEqual(!!tx.created_at, true, 'Transaction record create time');
  strictEqual(tx.description, undefined, 'No tx description');
  strictEqual(tx.fee, undefined, 'No transaction fee');
  strictEqual(!!tx.id, true, 'Transaction id');
  strictEqual(tx.is_confirmed, true, 'Transaction is confirmed');
  strictEqual(tx.is_outgoing, false, 'Transaction is incoming');
  strictEqual(tx.output_addresses.length, 1, 'Tx output address');
  strictEqual(tx.tokens, 5000000000, 'Got coinbase reward tokens');
  strictEqual(!!tx.transaction, true, 'Got transaction hex');

  const onlyAfter = await getChainTransactions({
    lnd,
    after: tx.confirmation_height,
  });

  strictEqual(onlyAfter.transactions.length, [].length, 'No txs after');

  const [height] = transactions
    .map(n => n.confirmation_height)
    .sort((a, b) => a - b);

  const onlyBefore = await getChainTransactions({lnd, before: height});

  strictEqual(onlyBefore.transactions.length, [].length, 'No tx before');

  const between = await getChainTransactions({
    lnd,
    after: tx.confirmation_height - 1,
    before: tx.confirmation_height + 1,
  });

  strictEqual(between.transactions.length, [tx].length, 'One transaction');

  await kill({});

  return;
});
