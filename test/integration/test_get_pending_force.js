const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {closeChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');

const anchorFeatureBit = 23;
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const giftTokens = 1e4;
const interval = 10;
const size = 2;
const spendableRatio = 0.99;
const times = 2000;

// Getting pending channels should show pending channels
test(`Get pending channels`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  const {features} = await getWalletInfo({lnd});

  const isAnchors = !!features.find(n => n.bit === anchorFeatureBit);
  const startHeight = (await getHeight({lnd})).current_block_height;

  await generate({count});

  const channelOpen = await asyncRetry({interval, times}, async () => {
    await addPeer({lnd, public_key: target.id, socket: target.socket});

    return await openChannel({
      lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_csv_delay: 10,
      partner_public_key: target.id,
      socket: target.socket,
    });
  });

  await getPendingChannels({lnd, id: channelOpen.transaction_id});

  const [pendingOpen] = (await getPendingChannels({lnd})).pending_channels;

  strictEqual(pendingOpen.local_balance, 986530, 'Local balance minus gift');
  strictEqual(pendingOpen.transaction_fee, 2810, 'Transaction fee tokens');
  strictEqual(pendingOpen.transaction_weight, 1116, 'Channel tx weight');

  strictEqual(pendingOpen.capacity, 1000000, 'Got channel opening capacity');
  strictEqual(pendingOpen.is_active, false, 'Not active yet');
  strictEqual(pendingOpen.is_closing, false, 'Not closing yet');
  strictEqual(pendingOpen.is_opening, true, 'Channel is opening');
  strictEqual(pendingOpen.local_reserve, 10000, 'Local reserve amount');
  strictEqual(pendingOpen.partner_public_key, target.id, 'Key');
  strictEqual(pendingOpen.pending_balance, undefined, 'No pending balance');
  strictEqual(pendingOpen.pending_payments, undefined, 'No pending payments');
  strictEqual(pendingOpen.received, 0, 'Nothing received');
  strictEqual(pendingOpen.recovered_tokens, undefined, 'Nothing recovered');
  strictEqual(pendingOpen.remote_balance, giftTokens, 'Tokens gifted');
  strictEqual(pendingOpen.remote_reserve, 10000, 'Remote reserve amount');
  strictEqual(pendingOpen.sent, 0, 'Nothing sent');
  strictEqual(pendingOpen.timelock_expiration, undefined, 'Not timelocked');
  strictEqual(pendingOpen.transaction_id, channelOpen.transaction_id, 'Tx id');
  strictEqual(pendingOpen.transaction_vout, channelOpen.transaction_vout, 'V');

  await generate({count: confirmationCount});

  await getChannels({lnd, id: channelOpen.transaction_id});

  const channelClose = await closeChannel({
    lnd,
    is_force_close: true,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  await getPendingChannels({lnd, id: channelOpen.transaction_id});

  const [waitClose] = (await getPendingChannels({lnd})).pending_channels;

  strictEqual(waitClose.local_balance, 986530, 'Original balance');
  strictEqual(waitClose.pending_balance, 986530, 'Waiting on balance');

  strictEqual(waitClose.capacity, 1000000, 'Got channel closing capacity');
  strictEqual(waitClose.is_active, false, 'Not active yet');
  strictEqual(waitClose.is_closing, true, 'Channel is closing');
  strictEqual(waitClose.is_opening, false, 'Not opening channel');
  strictEqual(waitClose.local_reserve, 10000, 'Local reserve of closing');
  strictEqual(waitClose.partner_public_key, target.id, 'Pkey');
  strictEqual(waitClose.pending_payments, undefined, 'No pending payments');
  strictEqual(waitClose.received, 0, 'Nothing received');
  strictEqual(waitClose.recovered_tokens, undefined, 'Funds not recovered');
  strictEqual(waitClose.remote_reserve, 10000, 'Remote reserve');
  strictEqual(waitClose.sent, 0, 'No sent tokens');
  strictEqual(waitClose.timelock_expiration, undefined, 'No timelock data');
  strictEqual(waitClose.transaction_fee, null, 'No tx fee data');
  strictEqual(waitClose.transaction_id, channelOpen.transaction_id, 'Txid');
  strictEqual(waitClose.transaction_vout, channelOpen.transaction_vout, 'Vt');
  strictEqual(waitClose.transaction_weight, null, 'No funding tx weight data');

  if (!!waitClose.remote_balance) {
    strictEqual(waitClose.remote_balance, giftTokens, 'Remote tokens');
  }

  strictEqual(waitClose.sent, 0, 'Channel never sent funds');
  strictEqual(waitClose.timelock_expiration, undefined, 'Not timelocked yet');
  strictEqual(waitClose.transaction_id, channelOpen.transaction_id, 'txid');
  strictEqual(waitClose.transaction_vout, channelOpen.transaction_vout, 'out');

  // Wait for generation to be over
  await asyncRetry({interval, times}, async () => {
    // Generate to confirm the tx
    await generate({});

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

  strictEqual(forceClose.local_balance, 986530, 'Original balance');
  strictEqual(forceClose.pending_balance, 986860, 'Waiting on balance');

  strictEqual(forceClose.capacity, 1000000, 'Got channel close capacity');
  strictEqual(forceClose.close_transaction_id, channelClose.transaction_id);
  strictEqual(forceClose.is_active, false, 'Not active anymore');
  strictEqual(forceClose.is_closing, true, 'Channel is force closing');
  strictEqual(forceClose.is_timelocked, true, 'Force close funds timelocked');
  strictEqual(forceClose.is_opening, false, 'Channel is not opening');
  strictEqual(forceClose.partner_public_key, target.id, 'pk');
  strictEqual(forceClose.received, 0, 'No receive amount');
  strictEqual(forceClose.recovered_tokens, undefined, 'No recovered amount');

  // LND 0.14.5 and below do not support remote balance info
  if (!!forceClose.remote_balance) {
    strictEqual(forceClose.remote_balance, giftTokens, 'Got gift remote');
  } else {
    strictEqual(forceClose.remote_balance, 0, 'No remote balance');
  }

  strictEqual(forceClose.sent, 0, 'No sent amount');
  strictEqual(!!forceClose.timelock_blocks, true, 'Timelock blocks set');
  strictEqual(forceClose.timelock_expiration, startHeight + 265, 'Funds lock');
  strictEqual(forceClose.transaction_id, channelOpen.transaction_id, 'Txid');
  strictEqual(forceClose.transaction_vout, channelOpen.transaction_vout, 'V');

  await kill({});

  return;
});
