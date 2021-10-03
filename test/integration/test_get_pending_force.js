const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {closeChannel} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getPeers} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {waitChannel} = require('./../macros');
const {waitPendingChannel} = require('./../macros');
const {waitForUtxo} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultVout = 0;
const giftTokens = 1e4;
const interval = retryCount => 10 * Math.pow(2, retryCount);
const spendableRatio = 0.99;
const times = 20;

// Getting pending channels should show pending channels
test(`Get pending channels`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const {features} = await getWalletInfo({lnd});

  const isAnchors = !!features.find(n => n.bit === 23);
  const startHeight = (await getHeight({lnd})).current_block_height

  const channelOpen = await asyncRetry({interval, times}, async () => {
    return await openChannel({
      lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_csv_delay: 10,
      partner_public_key: cluster.target.public_key,
      socket: cluster.target.socket,
    });
  });

  await getPendingChannels({lnd, id: channelOpen.transaction_id});

  const [pendingOpen] = (await getPendingChannels({lnd})).pending_channels;

  if (isAnchors) {
    equal(pendingOpen.local_balance, 986530, 'Local balance minus gift, fee');
    equal(pendingOpen.transaction_fee, 2810, 'Transaction fee tokens');
    equal(pendingOpen.transaction_weight, 1116, 'Channel tx weight');
  } else {
    equal(pendingOpen.local_balance, 980950, 'Local balance minus gift, fee');
    equal(pendingOpen.transaction_fee, 9050, 'Transaction fee tokens');
    equal(pendingOpen.transaction_weight, 724, 'Channel tx weight');
  }

  equal(pendingOpen.close_transaction_id, undefined, 'Not closing');
  equal(pendingOpen.is_active, false, 'Not active yet');
  equal(pendingOpen.is_closing, false, 'Not closing yet');
  equal(pendingOpen.is_opening, true, 'Channel is opening');
  equal(pendingOpen.local_reserve, 10000, 'Local reserve amount');
  equal(pendingOpen.partner_public_key, cluster.target_node_public_key, 'Key');
  equal(pendingOpen.pending_balance, undefined, 'No pending chain balance');
  equal(pendingOpen.pending_payments, undefined, 'No pending payments');
  equal(pendingOpen.received, 0, 'Nothing received');
  equal(pendingOpen.recovered_tokens, undefined, 'Nothing recovered');
  equal(pendingOpen.remote_balance, giftTokens, 'Tokens gifted');
  equal(pendingOpen.remote_reserve, 10000, 'Remote reserve amount');
  equal(pendingOpen.sent, 0, 'Nothing sent');
  equal(pendingOpen.timelock_expiration, undefined, 'Not timelocked');
  equal(pendingOpen.transaction_id, channelOpen.transaction_id, 'Open tx id');
  equal(pendingOpen.transaction_vout, channelOpen.transaction_vout, 'Tx vout');

  await cluster.generate({count: confirmationCount});

  await getChannels({lnd, id: channelOpen.transaction_id});

  const channelClose = await closeChannel({
    lnd,
    is_force_close: true,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  await getPendingChannels({lnd, id: channelOpen.transaction_id});

  await waitForUtxo({lnd, id: channelOpen.transaction_id});

  const [waitClose] = (await getPendingChannels({lnd})).pending_channels;

  // LND 0.11.1 and below do not support anchor channels
  if (isAnchors) {
    equal(waitClose.local_balance, 986530, 'Original balance');
    equal(waitClose.pending_balance, 986530, 'Waiting on balance');
  } else {
    equal(waitClose.local_balance, 980950, 'Original balance');
    equal(waitClose.pending_balance, 980950, 'Waiting on balance');
  }

  equal(waitClose.close_transaction_id, undefined, 'Waiting for close tx');
  equal(waitClose.is_active, false, 'Not active yet');
  equal(waitClose.is_closing, true, 'Channel is closing');
  equal(waitClose.is_opening, false, 'Not opening channel');
  equal(waitClose.local_reserve, 10000, 'Local reserve of closing channel');
  equal(waitClose.partner_public_key, cluster.target_node_public_key, 'Pkey');
  equal(waitClose.pending_payments, undefined, 'No pending payments data');
  equal(waitClose.received, 0, 'Nothing received');
  equal(waitClose.recovered_tokens, undefined, 'Funds not recovered yet');
  equal(waitClose.remote_reserve, 10000, 'Remote reserve');
  equal(waitClose.sent, 0, 'No sent tokens');
  equal(waitClose.timelock_expiration, undefined, 'No timelock data');
  equal(waitClose.transaction_fee, null, 'No tx fee data');
  equal(waitClose.transaction_id, channelOpen.transaction_id, 'Funding tx id');
  equal(waitClose.transaction_vout, channelOpen.transaction_vout, 'Tx vout');
  equal(waitClose.transaction_weight, null, 'No funding tx weight data');

  if (!!waitClose.remote_balance) {
    equal(waitClose.remote_balance, giftTokens, 'Remote tokens represented');
  }

  equal(waitClose.sent, 0, 'Channel never sent funds');
  equal(waitClose.timelock_expiration, undefined, 'Not timelocked yet');
  equal(waitClose.transaction_id, channelOpen.transaction_id, 'Chan txid');
  equal(waitClose.transaction_vout, channelOpen.transaction_vout, 'Chan vout');

  // Wait for generation to be over
  await asyncRetry({interval, times}, async () => {
    // Generate to confirm the tx
    await cluster.generate({});

    const [forceClose] = (await getPendingChannels({lnd})).pending_channels;

    if (!forceClose.close_transaction_id) {
      throw new Error('ExpectedCloseTransactionId');
    }

    if (!forceClose.timelock_expiration) {
      throw new Error('ExpectedTimelockExpiration');
    }

    return;
  });

  const [forceClose] = (await getPendingChannels({lnd})).pending_channels;

  // LND 0.11.1 and below do not support anchor channels
  if (isAnchors) {
    equal(forceClose.local_balance, 986530, 'Original balance');
    equal(forceClose.pending_balance, 986860, 'Waiting on balance');
  } else {
    equal(forceClose.local_balance, 980950, 'Original balance');
    equal(forceClose.pending_balance, 980950, 'Waiting on balance');
  }

  equal(forceClose.close_transaction_id, channelClose.transaction_id, 'Txid');
  equal(forceClose.is_active, false, 'Not active anymore');
  equal(forceClose.is_closing, true, 'Channel is force closing');
  equal(forceClose.is_timelocked, true, 'Force close funds are timelocked')
  equal(forceClose.is_opening, false, 'Channel is not opening');
  equal(forceClose.partner_public_key, cluster.target_node_public_key, 'pk');
  equal(forceClose.received, 0, 'No receive amount');
  equal(forceClose.recovered_tokens, undefined, 'No recovered amount');
  equal(forceClose.remote_balance, 0, 'No remote balance');
  equal(forceClose.sent, 0, 'No sent amount');
  equal(!!forceClose.timelock_blocks, true, 'Timelock blocks set');
  equal(forceClose.timelock_expiration, startHeight + 165, 'Funds timelocked');
  equal(forceClose.transaction_id, channelOpen.transaction_id, 'Chan-Txid');
  equal(forceClose.transaction_vout, channelOpen.transaction_vout, 'ChanVout');

  await cluster.kill({});

  return end();
});
