const EventEmitter = require('events');

const rowTypes = require('./conf/row_types');

const decBase = 10;
const msPerSec = 1e3;

/** Subscribe to graph updates

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <EventEmitter Object>

  @on(data) // channel_update
  {
    base_fee_mtokens: <Channel Base Fee Millitokens String>
    capacity: <Channel Capacity Tokens Number>
    channel_id: <Channel Id String>
    cltv_delta: <Channel CLTV Delta Number>
    fee_rate: <Channel Feel Rate In Millitokens Per Million Number>
    is_disabled: <Channel Is Disabled Bool>
    min_htlc_mtokens: <Channel Minimum HTLC Millitokens String>
    public_keys: [<Announcing Public Key>, <Target Public Key String>]
    transaction_id: <Channel Transaction Id String>
    transaction_vout: <Channel Transaction Output Index Number>
    type: <Row Type String>
    updated_at: <Update Received At ISO 8601 Date String>
  }

  @on(data) // closed_channel
  {
    capacity: <Channel Capacity Tokens Number>
    channel_id: <Channel Id String>
    close_height: <Channel Close Confirmed Block Height Number>
    transaction_id: <Channel Transaction Id String>
    transaction_vout: <Channel Transaction Output Index Number>
    type: <Row Type String>
    updated_at: <Update Received At ISO 8601 Date String>
  }

  @on(data) // node_update
  {
    alias: <Node Alias String>
    public_key: <Node Public Key String>
    [sockets]: [<Network Host And Port String>]
    type: <Row Type String>
    updated_at: <Update Received At ISO 8601 Date String>
  }
*/
module.exports = ({lnd}) => {
  const eventEmitter = new EventEmitter();
  const subscription = lnd.subscribeChannelGraph({});

  subscription.on('data', update => {
    const updatedAt = new Date().toISOString();

    if (!Array.isArray(update.channel_updates)) {
      return eventEmitter.emit('error', new Error('ExpectedChannelUpdates'));
    }

    if (!Array.isArray(update.closed_chans)) {
      return eventEmitter.emit('error', new Error('ExpectedClosedChans'));
    }

    if (!Array.isArray(update.node_updates)) {
      return eventEmitter.emit('error', new Error('ExpectedNodeUpdates'));
    }

    // Emit channel updates
    update.channel_updates.forEach(update => {
      if (!update.advertising_node) {
        return eventEmitter.emit('error', new Error('ExpectedAnnouncingKey'));
      }

      if (!update.capacity) {
        return eventEmitter.emit('error', new Error('ExpectedChanCapacity'));
      }

      if (!update.chan_id) {
        return eventEmitter.emit('error', new Error('ExpectedChannelId'));
      }

      if (!update.chan_point) {
        return eventEmitter.emit('error', new Error('ExpectedChanPoint'));
      }

      if (!Buffer.isBuffer(update.chan_point.funding_txid_bytes)) {
        return eventEmitter.emit('error', new Error('ExpectedChanPointTxId'));
      }

      if (update.chan_point.output_index === undefined) {
        return eventEmitter.emit('error', new Error('ExpectedChanPointVout'));
      }

      if (!update.connecting_node) {
        return eventEmitter.emit('error', new Error('ExpectedConnectingNode'));
      }

      if (!update.routing_policy) {
        return eventEmitter.emit('error', new Error('ExpectedRoutingPolicy'));
      }

      if (update.routing_policy.disabled === undefined) {
        return eventEmitter.emit('error', new Error('ExpectedDisabledStatus'));
      }

      if (!update.routing_policy.fee_base_msat) {
        return eventEmitter.emit('error', new Error('ExpectedFeeBaseMsat'));
      }

      if (!update.routing_policy.fee_rate_milli_msat) {
        return eventEmitter.emit('error', new Error('ExpectedFeeRate'));
      }

      if (!update.routing_policy.min_htlc) {
        return eventEmitter.emit('error', new Error('ExpectedMinHtlc'));
      }

      if (update.routing_policy.time_lock_delta === undefined) {
        return eventEmitter.emit('error', new Error('ExpectedCltvDelta'));
      }

      const transactionId = update.chan_point.funding_txid_bytes.reverse();

      return eventEmitter.emit('data', {
        base_fee_mtokens: update.routing_policy.fee_base_msat,
        capacity: parseInt(update.capacity, decBase),
        channel_id: update.chan_id,
        cltv_delta: update.routing_policy.time_lock_delta,
        fee_rate: parseInt(update.routing_policy.fee_rate_milli_msat, decBase),
        is_disabled: update.routing_policy.disabled,
        min_htlc_mtokens: update.routing_policy.min_htlc,
        public_keys: [update.advertising_node, update.connecting_node],
        transaction_id: transactionId.toString('hex'),
        transaction_vout: update.chan_point.output_index,
        type: rowTypes.channel_update,
        updated_at: updatedAt,
      });
    });

    // Emit closed channel updates
    update.closed_chans.forEach(update => {
      if (!update.capacity) {
        return eventEmitter.emit('error', new Error('ExpectedChanCapacity'));
      }

      if (!update.chan_id) {
        return eventEmitter.emit('error', new Error('ExpectedChannelId'));
      }

      if (!update.chan_point) {
        return eventEmitter.emit('error', new Error('ExpectedChanOutpoint'));
      }

      if (!Buffer.isBuffer(update.chan_point.funding_txid_bytes)) {
        return eventEmitter.emit('error', new Error('ExpectedChannelTxId'));
      }

      if (!update.closed_height) {
        return eventEmitter.emit('error', new Error('ExpectedCloseHeight'));
      }

      if (update.chan_point.output_index === undefined) {
        return eventEmitter.emit('error', new Error('ExpectedChanPointVout'));
      }

      const transactionId = update.chan_point.funding_txid_bytes.reverse();

      return eventEmitter.emit('data', {
        capacity: parseInt(update.capacity, decBase),
        channel_id: update.chan_id,
        close_height: update.closed_height,
        transaction_id: transactionId.toString('hex'),
        transaction_vout: update.chan_point.output_index,
        type: rowTypes.closed_channel,
        updated_at: updatedAt,
      });
    });

    // Emit node updates
    update.node_updates.forEach(node => {
      if (!Array.isArray(node.addresses)) {
        return eventEmitter.emit('error', new Error('ExpectedNodeAddresses'));
      }

      if (node.alias === undefined) {
        return eventEmitter.emit('error', new Error('ExpectedNodeAlias'));
      }

      if (!node.identity_key) {
        return eventEmitter.emit('error', new Error('ExpectedIdentityKey'));
      }

      return eventEmitter.emit('data', {
        alias: node.alias,
        public_key: node.identity_key,
        sockets: !node.addresses.length ? undefined : node.addresses,
        type: rowTypes.node_update,
        updated_at: updatedAt,
      });
    });

    return;
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('error', err => eventEmitter.emit('error', err));
  subscription.on('status', status => eventEmitter.emit('status', status));

  return eventEmitter;
};

