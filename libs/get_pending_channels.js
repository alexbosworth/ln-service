const _ = require('lodash');
const asyncAuto = require('async/auto');
const asyncMap = require('async/map');

/** Get pending channels.

  Both is_closing and is_opening are returned as part of a channel because
  a channel may be opening, closing, or active.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
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
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return asyncAuto({
    getPending: (cbk) => {
      return args.lnd_grpc_api.pendingChannels({}, (err, res) => {
        if (!!err) { return cbk([500, 'Get pending channels error', err]); }

        if (!res || !Array.isArray(res.pending_open_channels)) {
          return cbk([500, 'Expected pending open channels', res]);
        }

        if (!res || !Array.isArray(res.pending_closing_channels)) {
          return cbk([500, 'Expected pending open channels', res]);
        }

        if (!res || !Array.isArray(res.pending_force_closing_channels)) {
          return cbk([500, 'Expected pending open channels', res]);
        }

        const openingChannelOutpoints = res.pending_open_channels.map((n) => {
          return n.channel.channel_point;
        });

        const channels = []
          .concat(res.pending_open_channels)
          .concat(res.pending_closing_channels)
          .concat(res.pending_force_closing_channels);

        return cbk(null, {
          channels: channels.map((n) => n.channel),
          opening: openingChannelOutpoints,
        });
      });
    },

    pendingChannels: ['getPending', (res, cbk) => {
      const openingOutpoints = res.getPending.opening;

      return asyncMap(res.getPending.channels, (channel, cbk) => {
        if (!channel.channel_point) {
          return cbk([500, 'Expected channel outpoint', channel]);
        }

        const isOpening = _.includes(openingOutpoints, channel.channel_point);
        const [transactionId, vout] = channel.channel_point.split(':');

        if (channel.local_balance === undefined) {
          return cbk([500, 'Expected local balance', channel]);
        }

        if (!channel.remote_node_pub) {
          return cbk([500, 'Expected remote node pub', channel]);
        }

        if (channel.remote_balance === undefined) {
          return cbk([500, 'Expected remote balance', channel]);
        }

        return cbk(null, {
          is_active: false,
          is_closing: !isOpening,
          is_opening: isOpening,
          local_balance: parseInt(channel.local_balance),
          partner_public_key: channel.remote_node_pub,
          received: 0,
          remote_balance: parseInt(channel.remote_balance),
          sent: 0,
          transaction_id: transactionId,
          transaction_vout: parseInt(vout),
          transfers_count: 0,
        });
      },
      cbk);
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, res.pendingChannels);
  });
};

