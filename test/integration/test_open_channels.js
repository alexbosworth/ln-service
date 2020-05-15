const asyncRetry = require('async/retry');
const {extractTransaction} = require('psbt');
const {finalizePsbt} = require('psbt');
const {test} = require('tap');
const {transactionAsPsbt} = require('psbt');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {fundPendingChannels} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getChannels} = require('./../../');
const {openChannels} = require('./../../');
const {sendToChainAddresses} = require('./../../');

const capacity = 1e6;
const count = 10;
const interval = 500;
const race = promises => Promise.race(promises);
const timeout = 1000 * 10;
const times = 100;

// Opening channels should open up channels
test(`Open channel`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const chainTx = (await getChainTransactions({lnd})).transactions;

  const spending = chainTx.map(({transaction}) => transaction);

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  const channels = [cluster.target, cluster.remote].map(node => ({
    capacity,
    partner_public_key: node.public_key,
  }));

  let pending;

  try {
    pending = (await openChannels({channels, lnd})).pending;
  } catch (err) {
    const [, code] = err;

    if (code !== 'InsufficientBalanceToOpenChannels') {
      throw err;
    }

    // PSBT funded channels are not supported in LND 0.9.2 and below
    await cluster.kill({});

    return end();
  }

  // Normally funding would involve an un-broadcast transaction
  await sendToChainAddresses({lnd, send_to: pending});

  await asyncRetry({interval, times}, async() => {
    const {transactions} = await getChainTransactions({lnd});

    if (transactions.length !== pending.length) {
      throw new Error('ExpectedMultipleChainTransactions');
    }

    return;
  });

  const fundTx = (await getChainTransactions({lnd})).transactions
    .map(({transaction}) => transaction)
    .find(transaction => spending.find(spend => transaction !== spend));

  const fundingPsbt = transactionAsPsbt({spending, transaction: fundTx}).psbt

  const {psbt} = finalizePsbt({psbt: fundingPsbt});

  const reconstitutedTransaction = extractTransaction({psbt});

  await fundPendingChannels({
    lnd,
    channels: pending.map(({id}) => id),
    funding: psbt,
  });

  await asyncRetry({interval, times}, async () => {
    await cluster.generate({count});

    const {channels} = await getChannels({lnd})

    if (channels.filter(n => !!n.is_active).length !== pending.length) {
      throw new Error('ExpectedNewChannelsCreatedAndActive');
    }

    return;
  });

  await delay(interval);

  await cluster.kill({});

  return end();
});
