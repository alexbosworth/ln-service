const {test} = require('tap');

const {closeChannel} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getPeers} = require('./../../');
const {getPendingChannels} = require('./../../');
const {openChannel} = require('./../../');
const {waitChannel} = require('./../macros');
const {waitPendingChannel} = require('./../macros');
const {waitForUtxo} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultVout = 0;
const giftTokens = 1e4;
const spendableRatio = 0.99;

// Getting pending channels should show pending channels
test(`Get pending channels`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channelOpen = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: giftTokens,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await getPendingChannels({lnd, id: channelOpen.transaction_id});

  const [pendingOpen] = (await getPendingChannels({lnd})).pending_channels;

  equal(pendingOpen.close_transaction_id, undefined, 'Not closing');
  equal(pendingOpen.is_active, false, 'Not active yet');
  equal(pendingOpen.is_closing, false, 'Not closing yet');
  equal(pendingOpen.is_opening, true, 'Channel is opening');
  equal(pendingOpen.local_balance, 980950, 'Local balance minus gift, fee');
  equal(pendingOpen.partner_public_key, cluster.target_node_public_key, 'Key');
  equal(pendingOpen.pending_balance, undefined, 'No pending chain balance');
  equal(pendingOpen.received, 0, 'Nothing received');
  equal(pendingOpen.recovered_tokens, undefined, 'Nothing recovered');
  equal(pendingOpen.remote_balance, giftTokens, 'Tokens gifted');
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

  equal(waitClose.close_transaction_id, undefined, 'Waiting for close tx');
  equal(waitClose.is_active, false, 'Not active yet');
  equal(waitClose.is_closing, true, 'Channel is closing');
  equal(waitClose.is_opening, false, 'Not opening channel');
  equal(waitClose.local_balance, 980950, 'Local balance of channel');
  equal(waitClose.partner_public_key, cluster.target_node_public_key, 'Pkey');
  equal(waitClose.pending_balance, 980950, 'Tokens return to local wallet');
  equal(waitClose.received, 0, 'Nothing received');
  equal(waitClose.recovered_tokens, undefined, 'Funds not recovered yet');
  equal(waitClose.remote_balance, 0, 'Remote tokens not in channel');
  equal(waitClose.sent, 0, 'Channel never sent funds');
  equal(waitClose.timelock_expiration, undefined, 'Not timelocked yet');
  equal(waitClose.transaction_id, channelOpen.transaction_id, 'Chan txid');
  equal(waitClose.transaction_vout, channelOpen.transaction_vout, 'Chan vout');

  await cluster.generate({count: confirmationCount});

  await delay(3000);

  const [forceClose] = (await getPendingChannels({lnd})).pending_channels;

  await waitForUtxo({lnd, id: forceClose.transaction_id});

  equal(forceClose.close_transaction_id, channelClose.transaction_id, 'Txid');
  equal(forceClose.is_active, false, 'Not active anymore');
  equal(forceClose.is_closing, true, 'Channel is force closing');
  equal(forceClose.is_opening, false, 'Channel is not opening');
  equal(forceClose.local_balance, 980950, 'Local balance of channel');
  equal(forceClose.partner_public_key, cluster.target_node_public_key, 'pk');
  equal(forceClose.pending_balance, 980950, 'Tokens returning');
  equal(forceClose.received, 0, 'No receive amount');
  equal(forceClose.recovered_tokens, undefined, 'No recovered amount');
  equal(forceClose.remote_balance, 0, 'No remote balance');
  equal(forceClose.sent, 0, 'No sent amount');
  equal(forceClose.timelock_expiration, 607, 'Funds are timelocked');
  equal(forceClose.transaction_id, channelOpen.transaction_id, 'Chan-Txid');
  equal(forceClose.transaction_vout, channelOpen.transaction_vout, 'ChanVout');

  await cluster.kill({});

  return end();
});
