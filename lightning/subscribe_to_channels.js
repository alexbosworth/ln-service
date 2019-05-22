const EventEmitter = require('events');

const {chanFormat} = require('bolt07');

const getNode = require('./get_node');
const rowTypes = require('./conf/row_types');
const updateTypes = require('./conf/channel_update_types');

const decBase = 10;
const emptyChanId = '0';
const emptyTxId = Buffer.alloc(32).toString('hex');
const outpointSeparator = ':';

/** Subscribe to channel updates

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @on(data) // channel
  {
    capacity: <Channel Token Capacity Number>
    commit_transaction_fee: <Commit Transaction Fee Number>
    commit_transaction_weight: <Commit Transaction Weight Number>
    is_active: <Channel Active Bool>
    is_closing: <Channel Is Closing Bool>
    is_opening: <Channel Is Opening Bool>
    is_partner_initiated: <Channel Partner Opened Channel>
    is_private: <Channel Is Private Bool>
    local_balance: <Local Balance Tokens Number>
    partner_public_key: <Channel Partner Public Key String>
    pending_payments: [{
      id: <Payment Preimage Hash Hex String>
      is_outgoing: <Payment Is Outgoing Bool>
      timeout: <Chain Height Expiration Number>
      tokens: <Payment Tokens Number>
    }]
    received: <Received Tokens Number>
    remote_balance: <Remote Balance Tokens Number>
    sent: <Sent Tokens Number>
    transaction_id: <Blockchain Transaction Id String>
    transaction_vout: <Blockchain Transaction Vout Number>
    unsettled_balance: <Unsettled Balance Tokens Number>
  }

  @on(data) // channel_status
  {
    is_active: <Channel Is Active Bool>
    transaction_id: <Channel Funding Transaction Id String>
    transaction_vout: <Channel Funding Transaction Output Index Number>
    type: <Row Type String>
  }

  @on(data) // closed_channel
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
    type: <Row Type String>
  }
*/
module.exports = ({lnd}) => {
  if (!lnd || !lnd.default || !lnd.default.subscribeChannelEvents) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToChannels');
  }

  const eventEmitter = new EventEmitter();
  const subscription = lnd.default.subscribeChannelEvents({});

  subscription.on('data', update => {
    const updatedAt = new Date().toISOString();

    if (!update || !update.type || typeof update.type !== 'string') {
      return eventEmitter.emit('error', new Error('UnexpectedDataInChanSub'));
    }

    const updateType = update.type.toLowerCase();

    switch (updateType) {
    case updateTypes.channel_activated:
    case updateTypes.channel_deactivated:
      if (!update[updateType].funding_txid_bytes) {
        return eventEmitter.emit('error', new Error('ExpectedActiveChanTxId'));
      }

      if (update[updateType].output_index) {
        return eventEmitter.emit('error', new Error('ExpectedActiveChanVout'));
      }

      const changedTxId = update[updateType].funding_txid_bytes.reverse();

      eventEmitter.emit('data', {
        is_active: updateType === updateTypes.channel_activated,
        transaction_id: changedTxId.toString('hex'),
        transaction_vout: update[updateType].output_index,
        type: rowTypes.channel_status,
      });
      break;

    case updateTypes.channel_closed:
      if (!update[updateType].capacity) {
        eventEmitter.emit('error', new Error('ExpectedClosedChannelCapacity'));
        break;
      }

      if (!update[updateType].chan_id) {
        eventEmitter.emit('error', new Error('ExpectedClosedChannelId'));
        break;
      }

      if (!update[updateType].channel_point) {
        eventEmitter.emit('error', new Error('ExpectedClosedChannelOutpoint'));
        break;
      }

      if (update[updateType].close_height === undefined) {
        eventEmitter.emit('error', new Error('ExpectedClosedChannelHeight'));
        break;
      }

      if (!update[updateType].closing_tx_hash) {
        eventEmitter.emit('error', new Error('ExpectedClosedChannelTxId'));
        break;
      }

      if (!update[updateType].remote_pubkey) {
        eventEmitter.emit('error', new Error('ExpectedClosedChanPeerPubKey'));
        break;
      }

      if (!update[updateType].settled_balance) {
        eventEmitter.emit('error', new Error('ExpectedClosedChanBalance'));
        break;
      }

      if (!update[updateType].time_locked_balance) {
        eventEmitter.emit('error', new Error('ExpectedClosedTimelockedFunds'));
        break;
      }

      const channelPoint = update[updateType].channel_point;
      const hasId = update[updateType].chan_id !== emptyChanId;
      const n = update[updateType];

      const [txId, txVout] = channelPoint.split(outpointSeparator);

      const hasCloseTx = update[updateType].closing_tx_hash !== emptyTxId;

      eventEmitter.emit('data', {
        capacity: parseInt(update[updateType].capacity, decBase),
        close_confirm_height: !!n.close_height ? n.close_height : undefined,
        close_transaction_id: hasCloseTx ? n.closing_tx_hash : undefined,
        final_local_balance: parseInt(n.settled_balance, decBase),
        final_time_locked_balance: parseInt(n.time_locked_balance, decBase),
        id: hasId ? chanFormat({number: n.chan_id}).channel : undefined,
        is_breach_close: n.close_type === 'BREACH_CLOSE',
        is_cooperative_close: n.close_type === 'COOPERATIVE_CLOSE',
        is_funding_cancel: n.close_type === 'FUNDING_CANCELED',
        is_local_force_close: n.close_type === 'LOCAL_FORCE_CLOSE',
        is_remote_force_close: n.close_type === 'REMOTE_FORCE_CLOSE',
        partner_public_key: n.remote_pubkey,
        transaction_id: txId,
        transaction_vout: parseInt(txVout, decBase),
        type: rowTypes.closed_channel,
      });
      break;

    case updateTypes.channel_opened:
      const channel = update[updateType];

      if (channel.active === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenChanActiveState'));
        break;
      }

      if (channel.capacity === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenChannelCapacity'));
        break;
      }

      if (!channel.channel_point) {
        eventEmitter.emit('error', new Error('ExpectedOpenChannelPoint'));
        break;
      }

      if (channel.commit_fee === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenCommitFee'));
        break;
      }

      if (channel.commit_weight === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenCommitWeight'));
        break;
      }

      if (channel.fee_per_kw === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenFeePerKw'));
        break;
      }

      if (channel.local_balance === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenLocalBalance'));
        break;
      }

      if (channel.num_updates === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenNumUpdates'));
        break;
      }

      if (!Array.isArray(channel.pending_htlcs)) {
        eventEmitter.emit('error', new Error('ExpectedOpenChanPendingHtlcs'));
        break;
      }

      if (channel.private !== true && channel.private !== false) {
        eventEmitter.emit('error', new Error('ExpectedOpenChanPrivateStatus'));
        break;
      }

      if (channel.remote_balance === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenRemoteBalance'));
        break;
      }

      if (!channel.remote_pubkey) {
        eventEmitter.emit('error', new Error('ExpectedOpenRemotePubkey'));
        break;
      }

      if (channel.total_satoshis_received === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenChanTotalReceived'));
        break;
      }

      if (channel.total_satoshis_sent === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenChannelTotalSent'));
        break;
      }

      if (channel.unsettled_balance === undefined) {
        eventEmitter.emit('error', new Error('ExpectedOpenChanUnsettled'));
        break;
      }

      const {initiator} = channel;
      const [transactionId, vout] = channel.channel_point.split(':');

      const notInitiator = initiator === false ? undefined : !initiator;

      eventEmitter.emit('data', {
        capacity: parseInt(channel.capacity, decBase),
        commit_transaction_fee: parseInt(channel.commit_fee, decBase),
        commit_transaction_weight: parseInt(channel.commit_weight, decBase),
        is_active: channel.active,
        is_closing: false,
        is_opening: false,
        is_partner_initiated: notInitiator,
        is_private: channel.private,
        local_balance: parseInt(channel.local_balance, decBase),
        partner_public_key: channel.remote_pubkey,
        pending_payments: channel.pending_htlcs.map(n => ({
          id: n.hash_lock.toString('hex'),
          is_outgoing: !n.incoming,
          timeout: n.expiration_height,
          tokens: parseInt(n.amount, decBase),
        })),
        received: parseInt(channel.total_satoshis_received, decBase),
        remote_balance: parseInt(channel.remote_balance, decBase),
        sent: parseInt(channel.total_satoshis_sent, decBase),
        transaction_id: transactionId,
        transaction_vout: parseInt(vout, decBase),
        type: rowTypes.channel,
        unsettled_balance: parseInt(channel.unsettled_balance, decBase),
      });
      break;

    default:
      eventEmitter.emit('error', new Error('UnexpectedChannelUpdate'));
      break;
    }

    return;
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('error', err => eventEmitter.emit('error', err));
  subscription.on('status', status => eventEmitter.emit('status', status));

  return eventEmitter;
};
