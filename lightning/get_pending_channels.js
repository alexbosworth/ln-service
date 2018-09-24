const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {includes} = require('lodash');

const {returnResult} = require('./../async-util');

const intBase = 10;

/** Get pending channels.

  Both is_closing and is_opening are returned as part of a channel because
  a channel may be opening, closing, or active.

  {
    lnd: <Object>
  }

  @returns via cbk
  {
    pending_channels: [{
      id: <Channel Id String>
      is_active: <Channel Active Bool>
      is_closing: <Channel Closing Bool>
      is_opening: <Channel Opening Bool>
      local_balance: <Local Balance Satoshis Number>
      partner_public_key: <Channel Partner Public Key String>
      received: <Received Satoshis Number>
      remote_balance: <Remote Balance Satoshis Number>
      sent: <Sent Satoshis Number>
      transaction_id: <Blockchain Transaction Id>
      transaction_vout: <Blockchain Transaction Vout Number>
      transfers_count: <Channel Transfers Total Number>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.pendingChannels) {
    return cbk([400, 'ExpectedLndForPendingChannelsRequest']);
  }

  return asyncAuto({
    getPending: cbk => {
      return lnd.pendingChannels({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'PendingChannelsErr', err]);
        }

        if (!res || !Array.isArray(res.pending_open_channels)) {
          return cbk([503, 'ExpectedPendingOpenChannels', res]);
        }

        if (!res || !Array.isArray(res.pending_closing_channels)) {
          return cbk([503, 'ExpectedPendingClosingChannels', res]);
        }

        if (!res || !Array.isArray(res.pending_force_closing_channels)) {
          return cbk([503, 'ExpectedPendingForceCloseChannels', res]);
        }

        const opening = res.pending_open_channels.map(n => {
          return n.channel.channel_point;
        });

        const channels = []
          .concat(res.pending_open_channels)
          .concat(res.pending_closing_channels)
          .concat(res.pending_force_closing_channels)
          .map(n => n.channel);

        return cbk(null, {channels, opening});
      });
    },

    pendingChannels: ['getPending', ({getPending}, cbk) => {
      const openingOutpoints = getPending.opening;

      return asyncMap(getPending.channels, (channel, cbk) => {
        if (!channel.channel_point) {
          return cbk([503, 'ExpectedChannelOutpoint', channel]);
        }

        const isOpening = includes(openingOutpoints, channel.channel_point);
        const [transactionId, vout] = channel.channel_point.split(':');

        if (channel.local_balance === undefined) {
          return cbk([503, 'ExpectedLocalBalance', channel]);
        }

        if (!channel.remote_node_pub) {
          return cbk([503, 'ExpectedRemoteNodePub', channel]);
        }

        if (channel.remote_balance === undefined) {
          return cbk([503, 'ExpectedRemoteBalance', channel]);
        }

        return cbk(null, {
          is_active: false,
          is_closing: !isOpening,
          is_opening: isOpening,
          local_balance: parseInt(channel.local_balance, intBase),
          partner_public_key: channel.remote_node_pub,
          received: 0,
          remote_balance: parseInt(channel.remote_balance, intBase),
          sent: 0,
          transaction_id: transactionId,
          transaction_vout: parseInt(vout, intBase),
          transfers_count: 0,
        });
      },
      cbk);
    }],

    pending: ['pendingChannels', ({pendingChannels}, cbk) => {
      return cbk(null, {pending_channels: pendingChannels});
    }],
  },
  returnResult({of: 'pending'}, cbk));
};

