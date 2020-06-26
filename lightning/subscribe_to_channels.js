const EventEmitter = require('events');

const {chanFormat} = require('bolt07');
const {rpcChannelAsChannel} = require('lightning/lnd_responses');

const updateTypes = require('./conf/channel_update_types');

const emptyChanId = '0';
const emptyTxId = Buffer.alloc(32).toString('hex');
const outpointSeparator = ':';
const sumOf = arr => arr.reduce((sum, n) => sum + n, Number());

/** Subscribe to channel updates

  Requires `offchain:read` permission

  LND 0.9.0 and below do not emit `channel_opening` events.

  `local_given` and `remote_given` are not supported on LND 0.9.2 and below

  {
    lnd: <Authenticated LND API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'channel_active_changed'
  {
    is_active: <Channel Is Active Bool>
    transaction_id: <Channel Funding Transaction Id String>
    transaction_vout: <Channel Funding Transaction Output Index Number>
  }

  @event 'channel_closed'
  {
    capacity: <Closed Channel Capacity Tokens Number>
    [close_confirm_height]: <Channel Close Confirmation Height Number>
    [close_transaction_id]: <Closing Transaction Id Hex String>
    final_local_balance: <Channel Close Final Local Balance Tokens Number>
    final_time_locked_balance: <Closed Channel Timelocked Tokens Number>
    [id]: <Closed Standard Format Channel Id String>
    is_breach_close: <Is Breach Close Bool>
    is_cooperative_close: <Is Cooperative Close Bool>
    is_funding_cancel: <Is Funding Cancelled Close Bool>
    is_local_force_close: <Is Local Force Close Bool>
    is_remote_force_close: <Is Remote Force close Bool>
    partner_public_key: <Partner Public Key Hex String>
    transaction_id: <Channel Funding Transaction Id Hex String>
    transaction_vout: <Channel Funding Output Index Number>
  }

  @event 'channel_opened'
  {
    capacity: <Channel Token Capacity Number>
    commit_transaction_fee: <Commit Transaction Fee Number>
    commit_transaction_weight: <Commit Transaction Weight Number>
    [cooperative_close_address]: <Coop Close Restricted to Address String>
    id: <Standard Format Channel Id String>
    is_active: <Channel Active Bool>
    is_closing: <Channel Is Closing Bool>
    is_opening: <Channel Is Opening Bool>
    is_partner_initiated: <Channel Partner Opened Channel Bool>
    is_private: <Channel Is Private Bool>
    [is_static_remote_key]: <Remote Key Is Static Bool>
    local_balance: <Local Balance Tokens Number>
    [local_given]: <Local Initially Pushed Tokens Number>
    local_reserve: <Local Reserved Tokens Number>
    partner_public_key: <Channel Partner Public Key String>
    pending_payments: [{
      id: <Payment Preimage Hash Hex String>
      is_outgoing: <Payment Is Outgoing Bool>
      timeout: <Chain Height Expiration Number>
      tokens: <Payment Tokens Number>
    }]
    received: <Received Tokens Number>
    remote_balance: <Remote Balance Tokens Number>
    [remote_given]: <Remote Initially Pushed Tokens Number>
    remote_reserve: <Remote Reserved Tokens Number>
    sent: <Sent Tokens Number>
    transaction_id: <Blockchain Transaction Id String>
    transaction_vout: <Blockchain Transaction Vout Number>
    unsettled_balance: <Unsettled Balance Tokens Number>
  }

  @event 'channel_opening'
  {
    transaction_id: <Blockchain Transaction Id Hex String>
    transaction_vout: <Blockchain Transaction Output Index Number>
  }
*/
module.exports = ({lnd}) => {
  if (!lnd || !lnd.default || !lnd.default.subscribeChannelEvents) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToChannels');
  }

  const eventEmitter = new EventEmitter();
  const subscription = lnd.default.subscribeChannelEvents({});

  // Cancel the subscription when all listeners are removed
  eventEmitter.on('removeListener', () => {
    const events = [
      'channel_active_changed',
      'channel_closed',
      'channel_opened',
      'channel_opening',
    ];

    const listenerCounts = events.map(n => eventEmitter.listenerCount(n));

    // Exit early when there are still listeners
    if (!!sumOf(listenerCounts)) {
      return;
    }

    subscription.cancel();

    return;
  });

  const error = err => {
    // Exit early when no one is listening to the error
    if (!eventEmitter.listenerCount('error')) {
      return;
    }

    return eventEmitter.emit('error', err);
  };

  subscription.on('data', update => {
    const updatedAt = new Date().toISOString();

    if (!update || !update.type || typeof update.type !== 'string') {
      return error(new Error('UnexpectedDataInChanSubscription'));
    }

    const updateType = update.type.toLowerCase();

    switch (updateType) {
    case updateTypes.channel_activated:
    case updateTypes.channel_deactivated:
      if (!update[updateType].funding_txid_bytes) {
        return error(new Error('ExpectedActiveChannelTransactionIdInEvent'));
      }

      if (update[updateType].output_index === undefined) {
        return error(new Error('ExpectedActiveChannelVoutInUpdateEvent'));
      }

      const changedTxId = update[updateType].funding_txid_bytes.reverse();

      eventEmitter.emit('channel_active_changed', {
        is_active: updateType === updateTypes.channel_activated,
        transaction_id: changedTxId.toString('hex'),
        transaction_vout: update[updateType].output_index,
      });
      break;

    case updateTypes.channel_closed:
      if (!update[updateType].capacity) {
        error(new Error('ExpectedClosedChannelCapacityInCloseEvent'));
        break;
      }

      if (!update[updateType].chan_id) {
        error(new Error('ExpectedClosedChannelIdInCloseEvent'));
        break;
      }

      if (!update[updateType].channel_point) {
        error(new Error('ExpectedClosedChannelOutpointInCloseEvent'));
        break;
      }

      if (update[updateType].close_height === undefined) {
        error(new Error('ExpectedClosedChannelHeightInCloseEvent'));
        break;
      }

      if (!update[updateType].closing_tx_hash) {
        error(new Error('ExpectedClosedChannelTransactionIdInCloseEvent'));
        break;
      }

      if (!update[updateType].remote_pubkey) {
        error(new Error('ExpectedClosedChanPeerPubKeyInCloseEvent'));
        break;
      }

      if (!update[updateType].settled_balance) {
        error(new Error('ExpectedClosedChanBalanceInCloseEvent'));
        break;
      }

      if (!update[updateType].time_locked_balance) {
        error(new Error('ExpectedClosedTimelockedFundsInCloseEvent'));
        break;
      }

      const channelPoint = update[updateType].channel_point;
      const hasId = update[updateType].chan_id !== emptyChanId;
      const n = update[updateType];

      const [txId, txVout] = channelPoint.split(outpointSeparator);

      const hasCloseTx = update[updateType].closing_tx_hash !== emptyTxId;

      eventEmitter.emit('channel_closed', {
        capacity: Number(update[updateType].capacity),
        close_confirm_height: !!n.close_height ? n.close_height : undefined,
        close_transaction_id: hasCloseTx ? n.closing_tx_hash : undefined,
        final_local_balance: Number(n.settled_balance),
        final_time_locked_balance: Number(n.time_locked_balance),
        id: hasId ? chanFormat({number: n.chan_id}).channel : undefined,
        is_breach_close: n.close_type === 'BREACH_CLOSE',
        is_cooperative_close: n.close_type === 'COOPERATIVE_CLOSE',
        is_funding_cancel: n.close_type === 'FUNDING_CANCELED',
        is_local_force_close: n.close_type === 'LOCAL_FORCE_CLOSE',
        is_remote_force_close: n.close_type === 'REMOTE_FORCE_CLOSE',
        partner_public_key: n.remote_pubkey,
        transaction_id: txId,
        transaction_vout: Number(txVout),
      });
      break;

    case updateTypes.channel_opened:
      const channel = update[updateType];

      if (channel.active === undefined) {
        error(new Error('ExpectedOpenChanActiveState'));
        break;
      }

      if (channel.capacity === undefined) {
        error(new Error('ExpectedOpenChannelCapacity'));
        break;
      }

      if (!channel.channel_point) {
        error(new Error('ExpectedOpenChannelPoint'));
        break;
      }

      if (channel.commit_fee === undefined) {
        error(new Error('ExpectedOpenCommitFee'));
        break;
      }

      if (channel.commit_weight === undefined) {
        error(new Error('ExpectedOpenCommitWeight'));
        break;
      }

      if (channel.fee_per_kw === undefined) {
        error(new Error('ExpectedOpenFeePerKw'));
        break;
      }

      if (channel.local_balance === undefined) {
        error(new Error('ExpectedOpenLocalBalance'));
        break;
      }

      if (channel.num_updates === undefined) {
        error(new Error('ExpectedOpenNumUpdates'));
        break;
      }

      if (!Array.isArray(channel.pending_htlcs)) {
        error(new Error('ExpectedOpenChanPendingHtlcs'));
        break;
      }

      if (channel.private !== true && channel.private !== false) {
        error(new Error('ExpectedOpenChanPrivateStatus'));
        break;
      }

      if (channel.remote_balance === undefined) {
        error(new Error('ExpectedOpenRemoteBalance'));
        break;
      }

      if (!channel.remote_pubkey) {
        error(new Error('ExpectedOpenRemotePubkey'));
        break;
      }

      if (channel.total_satoshis_received === undefined) {
        error(new Error('ExpectedOpenChanTotalReceived'));
        break;
      }

      if (channel.total_satoshis_sent === undefined) {
        error(new Error('ExpectedOpenChannelTotalSent'));
        break;
      }

      if (channel.unsettled_balance === undefined) {
        error(new Error('ExpectedOpenChanUnsettled'));
        break;
      }

      const [transactionId, vout] = channel.channel_point.split(':');

      eventEmitter.emit('channel_opened', rpcChannelAsChannel(channel));
      break;

    case updateTypes.channel_opening:
      if (!Buffer.isBuffer(update[updateType].txid)) {
        error(new Error('ExpectedChannelTransactionIdForChannelOpening'));
        break;
      }

      if (update[updateType].output_index === undefined) {
        error(new Error('ExpectedChannelTransactionVoutForChannelOpening'));
        break;
      }

      eventEmitter.emit('channel_opening', {
        transaction_id: update[updateType].txid.reverse().toString('hex'),
        transaction_vout: Number(update[updateType].output_index),
      });
      break;

    default:
      error(new Error('UnexpectedChannelUpdate'));
      break;
    }

    return;
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('error', err => error(err));
  subscription.on('status', status => eventEmitter.emit('status', status));

  return eventEmitter;
};
