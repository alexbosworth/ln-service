const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getWalletInfo} = require('./../../');

const count = 100;
const defaultFee = 1e3;
const format = 'np2wpkh';
const times = 300;

// Getting chain transactions should list out the chain transactions
test(`Get chain transactions`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  // Generate some funds for LND
  await generate({count});

  await asyncRetry({interval: 10, times: 1000}, async () => {
    const wallet = await getWalletInfo({lnd});

    if (!wallet.is_synced_to_chain) {
      throw new Error('ExpectedWalletSyncedToChain');
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

  const onlyAfter = await getChainTransactions({
    lnd,
    after: tx.confirmation_height,
  });

  equal(onlyAfter.transactions.length, [].length, 'No transactions after');

  const [height] = transactions
    .map(n => n.confirmation_height)
    .sort((a, b) => a - b);

  const onlyBefore = await getChainTransactions({lnd, before: height});

  equal(onlyBefore.transactions.length, [].length, 'No tx before');

  const between = await getChainTransactions({
    lnd,
    after: tx.confirmation_height - 1,
    before: tx.confirmation_height + 1,
  });

  strictSame(between.transactions.length, [tx].length, 'One transaction');

  await kill({});

  return end();
});
