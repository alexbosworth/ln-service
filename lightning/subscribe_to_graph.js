const EventEmitter = require('events');

const {chanFormat} = require('bolt07');
const {getNode} = require('lightning/lnd_methods');

const emptyTxId = Buffer.alloc(32);
const {isArray} = Array;
const msPerSec = 1e3;

/** Subscribe to graph updates

  Requires `info:read` permission

  {
    lnd: <Authenticated LND API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'channel_closed'
  {
    capacity: <Channel Capacity Tokens Number>
    close_height: <Channel Close Confirmed Block Height Number>
    id: <Standard Format Channel Id String>
    transaction_id: <Channel Transaction Id String>
    transaction_vout: <Channel Transaction Output Index Number>
    updated_at: <Update Received At ISO 8601 Date String>
  }

  @event 'channel_updated'
  {
    base_fee_mtokens: <Channel Base Fee Millitokens String>
    [capacity]: <Channel Capacity Tokens Number>
    cltv_delta: <Channel CLTV Delta Number>
    fee_rate: <Channel Feel Rate In Millitokens Per Million Number>
    id: <Standard Format Channel Id String>
    is_disabled: <Channel Is Disabled Bool>
    [max_htlc_mtokens]: <Channel Maximum HTLC Millitokens String>
    min_htlc_mtokens: <Channel Minimum HTLC Millitokens String>
    public_keys: [<Announcing Public Key>, <Target Public Key String>]
    [transaction_id]: <Channel Transaction Id String>
    [transaction_vout]: <Channel Transaction Output Index Number>
    updated_at: <Update Received At ISO 8601 Date String>
  }

  @event 'node_updated'
  {
    alias: <Node Alias String>
    color: <Node Color String>
    public_key: <Node Public Key String>
    [sockets]: [<Network Host And Port String>]
    updated_at: <Update Received At ISO 8601 Date String>
  }
*/
module.exports = ({lnd}) => {
  if (!lnd || !lnd.default || !lnd.default.subscribeChannelGraph) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToChannelGraph');
  }

  const eventEmitter = new EventEmitter();
  const subscription = lnd.default.subscribeChannelGraph({});

  subscription.on('data', update => {
    const updatedAt = new Date().toISOString();

    if (!isArray(update.channel_updates)) {
      return eventEmitter.emit('error', new Error('ExpectedChannelUpdates'));
    }

    if (!isArray(update.closed_chans)) {
      return eventEmitter.emit('error', new Error('ExpectedClosedChans'));
    }

    if (!isArray(update.node_updates)) {
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

      try {
        chanFormat({number: update.chan_id});
      } catch (err) {
        return eventEmitter.emit('error', new Error('ExpectedValidChannelId'));
      }

      const txId = !!transactionId.equals(emptyTxId) ? null : transactionId;

      return eventEmitter.emit('channel_updated', {
        base_fee_mtokens: update.routing_policy.fee_base_msat,
        capacity: Number(update.capacity) || undefined,
        cltv_delta: update.routing_policy.time_lock_delta,
        fee_rate: Number(update.routing_policy.fee_rate_milli_msat),
        id: chanFormat({number: update.chan_id}).channel,
        is_disabled: update.routing_policy.disabled,
        max_htlc_mtokens: update.routing_policy.max_htlc_msat,
        min_htlc_mtokens: update.routing_policy.min_htlc,
        public_keys: [update.advertising_node, update.connecting_node],
        transaction_id: !txId ? undefined : txId.toString('hex'),
        transaction_vout: !txId ? undefined : update.chan_point.output_index,
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

      try {
        chanFormat({number: update.chan_id});
      } catch (err) {
        return eventEmitter.emit('error', new Error('ExpectedValidChannelId'));
      }

      return eventEmitter.emit('channel_closed', {
        capacity: Number(update.capacity),
        close_height: update.closed_height,
        id: chanFormat({number: update.chan_id}).channel,
        transaction_id: transactionId.toString('hex'),
        transaction_vout: update.chan_point.output_index,
        updated_at: updatedAt,
      });
    });

    // Emit node updates
    update.node_updates.forEach(node => {
      if (!isArray(node.addresses)) {
        return eventEmitter.emit('error', new Error('ExpectedNodeAddresses'));
      }

      if (node.alias === undefined) {
        return eventEmitter.emit('error', new Error('ExpectedNodeAlias'));
      }

      if (!node.identity_key) {
        return eventEmitter.emit('error', new Error('ExpectedIdentityKey'));
      }

      // Exit early when the node color is emitted
      if (!!node.color) {
        return eventEmitter.emit('node_updated', {
          alias: node.alias,
          color: node.color,
          public_key: node.identity_key,
          sockets: !node.addresses.length ? undefined : node.addresses,
          updated_at: updatedAt,
        });
      }

      return getNode({lnd, public_key: node.identity_key}, (err, res) => {
        if (!!err) {
          return eventEmitter.emit('error', new Error('FailedToFetchNode'));
        }

        const {color} = res;

        return eventEmitter.emit('node_updated', {
          color,
          alias: node.alias,
          public_key: node.identity_key,
          sockets: !node.addresses.length ? undefined : node.addresses,
          updated_at: updatedAt,
        });
      });
    });

    return;
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('error', err => eventEmitter.emit('error', err));
  subscription.on('status', status => eventEmitter.emit('status', status));

  return eventEmitter;
};
