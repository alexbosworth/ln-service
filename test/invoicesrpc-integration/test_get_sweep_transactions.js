const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {closeChannel} = require('./../../');
const {createHodlInvoice} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getClosedChannels} = require('./../../');
const {getInvoice} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getSweepTransactions} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');

const blockDelay = 50;
const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const give = 1e5;
const interval = 50;
const size = 2;
const times = 10000;
const tokens = 100;

// Force close a channel and get the resulting sweep transaction
test(`Get sweep transactions`, async t => {
  const {kill, nodes} = await spawnLightningCluster({size});

  // Stop the spawned nodes whether the test passes or fails
  t.after(() => kill({}));

  const [{generate, lnd}, target] = nodes;

  await asyncRetry({interval, times}, async () => {
    const wallet = await getWalletInfo({lnd});

    await generate({});

    if (!wallet.is_synced_to_chain) {
      throw new Error('NotSyncedToChain');
    }
  });

  const channel = await setupChannel({
    generate,
    lnd,
    give_tokens: give,
    partner_csv_delay: blockDelay,
    to: target,
  });

  await closeChannel({
    lnd,
    is_force_close: true,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  await asyncRetry({interval, times}, async () => {
    await generate({});

    if (!!(await getClosedChannels({lnd})).channels.length) {
      return;
    }

    throw new Error('ExpectedClosedChannel');
  });

  const transactions = await asyncRetry({interval, times}, async () => {
    const {transactions} = await getSweepTransactions({lnd});

    const [transaction] = transactions;

    if (!transaction || !transaction.block_id) {
      throw new Error('ExpectedTransactionBlockId');
    }

    return transactions;
  });

  const [transaction] = transactions;

  const anchorTokens = transaction.tokens;

  equal(anchorTokens, 896395, 'Sweep has tokens amount');

  equal(transaction.block_id.length, 64, 'Sweep confirmed');
  equal(!!transaction.confirmation_count, true, 'Sweep confirm count');
  equal(!!transaction.confirmation_height, true, 'Sweep confirm height');
  equal(!!transaction.created_at, true, 'Sweep creation date');
  equal(transaction.fee, undefined, 'Sweep fee is undefined');
  equal(transaction.id.length, 64, 'Sweep has transaction id');
  equal(transaction.is_confirmed, true, 'Sweep is confirmed');
  equal(transaction.output_addresses.length, 1, 'Sweep has out address');
  equal(!!transaction.transaction.length, true, 'Sweep has transaction');

  if (!!transaction.description) {
    equal(transaction.description, '0:sweep', 'Sweep has description');
  } else {
    equal(transaction.description, undefined, 'Sweep has description');
  }

  return;
});
