const {equal} = require('node:assert').strict;
const {exit} = require('node:process');
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
const {getPendingSweeps} = require('./../../');
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

// Force close a channel and get the resulting pending sweeps
test(`Get pending sweeps`, async t => {
  const {kill, nodes} = await spawnLightningCluster({size});

  t.after(() => exit());

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

  const closing = await closeChannel({
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

  const {sweeps} = await getPendingSweeps({lnd});

  const [sweep] = sweeps;

  equal(sweep.transaction_id, closing.transaction_id, 'Got closing sweep');

  await kill({});

  return;
});
