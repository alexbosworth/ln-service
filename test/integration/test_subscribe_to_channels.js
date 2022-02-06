const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {closeChannel} = require('./../../');
const {getChainBalance} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {removePeer} = require('./../../');
const {subscribeToChannels} = require('./../../');

const channelCapacityTokens = 1e6;
const defaultFee = 1e3;
const giveTokens = 1e5;
const interval = 100;
const size = 2;
const times = 200;

// Subscribing to channels should trigger channel events
test('Subscribe to channels', async ({end, equal, fail}) => {
  const activeChanged = [];
  const channelAdding = [];
  const channelClosed = [];
  const channelOpened = [];
  const {kill, nodes} = await spawnLightningCluster({size});
  const errors = [];

  const [control, target] = nodes;

  const {generate, lnd} = control;

  const {socket} = target;

  const {features} = await getWalletInfo({lnd});
  const sub = subscribeToChannels({lnd});

  const isAnchors = !!features.find(n => n.bit === 23);

  sub.on('channel_active_changed', update => activeChanged.push(update));
  sub.on('channel_closed', update => channelClosed.push(update));
  sub.on('channel_opened', update => channelOpened.push(update));
  sub.on('channel_opening', update => channelAdding.push(update));
  sub.on('error', err => errors.push(err));

  await asyncRetry({times: 150}, async () => {
    if (!(await getChainBalance({lnd})).chain_balance) {
      await generate({});

      throw new Error('ExpectedChainBalanceToOpenChannel');
    }
  });

  const channelOpen = await asyncRetry({interval, times}, async () => {
    await addPeer({lnd, public_key: target.id, socket: target.socket});

    // Create a channel from the control to the target node
    return await openChannel({
      lnd,
      socket,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giveTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: target.id,
    });
  });

  // Wait for the channel to confirm
  await asyncRetry({interval, times}, async () => {
    // Generate to confirm the tx
    await generate({});

    if (!channelOpened.length) {
      throw new Error('ExpectedChannelOpened');
    }

    return;
  });

  const pendingEvent = channelAdding.pop();

  equal(pendingEvent.transaction_id, channelOpen.transaction_id, 'Got txid');
  equal(pendingEvent.transaction_vout, channelOpen.transaction_vout, 'Vout');

  const openEvent = channelOpened.pop();

  if (!!openEvent.local_given) {
    equal(openEvent.local_given, giveTokens, 'Push tokens are reflected');
    equal(openEvent.remote_given, Number(), 'Push tokens are reflected');
  }

  if (!!openEvent.remote_given) {
    equal(openEvent.local_given, Number(), 'Push tokens are reflected');
    equal(openEvent.remote_given, giveTokens, 'Push tokens are reflected');
  }

  // LND 0.11.1 and before do not use anchors
  if (isAnchors) {
    equal(openEvent.commit_transaction_fee, 2810, 'Channel commit tx fee');
    equal(openEvent.commit_transaction_weight, 1116, 'Commit tx weight');
    equal(openEvent.local_balance, 896530, 'Channel local balance returned');
  } else {
    equal(openEvent.commit_transaction_fee, 9050, 'Channel commit tx fee');
    equal(openEvent.commit_transaction_weight, 724, 'Commit tx weight');
    equal(openEvent.local_balance, 890950, 'Channel local balance returned');
  }

  equal(openEvent.capacity, channelCapacityTokens, 'Channel open capacity');
  equal(!!openEvent.id, true, 'Channel id is returned');
  equal(openEvent.is_active, true, 'Channel is active');
  equal(openEvent.is_closing, false, 'Channel is not inactive');
  equal(openEvent.is_opening, false, 'Channel is no longer opening');
  equal(openEvent.is_partner_initiated, false, 'Channel was locally made');
  equal(openEvent.is_private, false, 'Channel is not private by default');
  equal(openEvent.local_reserve, 10000, 'Reserve tokens are reflected');
  equal(openEvent.partner_public_key, target.id, 'Peer pk');
  equal(openEvent.pending_payments.length, [].length, 'No pending payments');
  equal(openEvent.received, 0, 'Not received anything yet');
  equal(openEvent.remote_balance, giveTokens, 'Gift tokens is remote balance');
  equal(openEvent.remote_reserve, 10000, 'Reserve tokens are reflected');
  equal(openEvent.sent, 0, 'No tokens sent yet');
  equal(openEvent.transaction_id, channelOpen.transaction_id, 'Funding tx id');
  equal(openEvent.transaction_vout, channelOpen.transaction_vout, 'Fund vout');
  equal(openEvent.unsettled_balance, 0, 'No unsettled balance');

  // Wait for the channel close to confirm
  await asyncRetry({interval, times}, async () => {
    try {
      // Close the channel
      const channelClose = await closeChannel({
        lnd,
        tokens_per_vbyte: defaultFee,
        transaction_id: channelOpen.transaction_id,
        transaction_vout: channelOpen.transaction_vout,
      });
    } catch (err) {}

    // Generate to confirm the close
    await generate({});

    if (!channelClosed.length) {
      throw new Error('ExpectedChannelClosed');
    }

    return;
  });

  const closeEvent = channelClosed.pop();

  if (isAnchors) {
    equal(closeEvent.final_local_balance, 897190, 'Close final local balance');
  } else {
    equal(closeEvent.final_local_balance, 890950, 'Close final local balance');
  }

  equal(closeEvent.capacity, channelCapacityTokens, 'Channel close capacity');
  equal(!!closeEvent.close_confirm_height, true, 'Close confirm height');
  equal(!!closeEvent.close_transaction_id, true, 'Tx id');
  equal(closeEvent.final_time_locked_balance, 0, 'Close final locked balance');
  equal(!!closeEvent.id, true, 'Close channel id');
  equal(closeEvent.is_breach_close, false, 'Not breach close');
  equal(closeEvent.is_cooperative_close, true, 'Cooperative close');
  equal(closeEvent.is_funding_cancel, false, 'Not funding cancel');
  equal(closeEvent.is_local_force_close, false, 'Not local force close');
  equal(closeEvent.is_remote_force_close, false, 'Not remote force close');
  equal(closeEvent.partner_public_key, target.id, 'Pk');
  equal(closeEvent.transaction_id, channelOpen.transaction_id, 'Chan tx id');
  equal(closeEvent.transaction_vout, channelOpen.transaction_vout, 'Tx vout');

  equal(errors.length, [].length, 'No errors encountered');

  const [activated, deactivated] = activeChanged;

  equal(activated.is_active, true, 'Channel was activated');
  equal(activated.transaction_id, channelOpen.transaction_id, 'Chan tx id');
  equal(activated.transaction_vout, channelOpen.transaction_vout, 'Chan vout');

  equal(deactivated.is_active, false, 'Channel was de-activated');
  equal(deactivated.transaction_id, channelOpen.transaction_id, 'Chan tx id');
  equal(deactivated.transaction_vout, channelOpen.transaction_vout, 'Tx vout');

  sub.removeAllListeners();

  await kill({});

  return end();
});
