const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {closeChannel} = require('./../../');
const {createHodlInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChainTransactions} = require('./../../');
const {getClosedChannels} = require('./../../');
const {getInvoice} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getSweepTransactions} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToInvoice} = require('./../../');

const anchorsFeatureBit = 23;
const blockDelay = 50;
const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const give = 1e5;
const interval = 200;
const size = 2;
const times = 1000;
const tokens = 100;

// Force close a channel and get the resulting sweep transaction
test(`Get sweep transactions`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  const {features} = await getWalletInfo({lnd});

  const isAnchors = !!features.find(n => n.bit === anchorsFeatureBit);

  const channel = await setupChannel({
    generate,
    give,
    lnd,
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

  const {transactions} = await getSweepTransactions({lnd});

  const [transaction] = transactions;

  // LND 0.12.0 uses anchor channels
  if (isAnchors) {
    const [anchorTokens, sweepTokens] = transactions
      .map(n => n.tokens).sort();

    equal(transactions.length, 2, 'Got closed channel sweep');
    equal(anchorTokens, 149, 'Sweep has tokens amount');
    equal(sweepTokens, 890455, 'Sweep has tokens amount');
  } else {
    equal(transactions.length, [channel].length, 'Got closed channel sweep');
    equal(transaction.spends.length, 1, 'Sweep has spends');
    equal(transaction.tokens, 884875, 'Sweep has tokens amount');
  }

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

  await kill({});

  return end();
});
