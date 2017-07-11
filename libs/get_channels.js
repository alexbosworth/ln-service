const asyncAuto = require('async/auto');
const asyncMap = require('async/map');

/** Get channels

  {
    lnd_grpc_api: {listChannels: <Function>}
  }

  @returns via cbk
  [{
    capacity: <Channel Token Capacity Number>
    commit_transaction_fee: <Commit Transaction Fee Number>
    commit_transaction_weight: <Commit Transaction Weight Number>
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
    unsettled_balance: <Unsettled Balance Satoshis Number>
  }]
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api || !args.lnd_grpc_api.listChannels) {
    return cbk([500, 'Missing lnd grpc api', args]);
  }

  return asyncAuto({
    getChannels: (cbk) => {
      return args.lnd_grpc_api.listChannels({}, (err, res) => {
        if (!!err) { return cbk([500, 'Get channels error', err, res]); }

        if (!res || !Array.isArray(res.channels)) {
          return cbk([500, 'Expected channels array', res]);
        }

        return cbk(null, res.channels);
      });
    },

    channels: ['getChannels', (res, cbk) => {
      return asyncMap(res.getChannels, (channel, cbk) => {
        if (!Array.isArray(channel.pending_htlcs)) {
          return cbk([500, 'Expected pending htlcs', channel]);
        }

        if (channel.active === undefined) {
          return cbk([500, 'Expected channel active state', channel]);
        }

        if (!channel.remote_pubkey) {
          return cbk([500, 'Expected remote pubkey', channel]);
        }

        if (!channel.channel_point) {
          return cbk([500, 'Expected channel point', channel]);
        }

        if (!channel.chan_id) {
          return cbk([500, 'Expected chan id', channel]);
        }

        if (channel.capacity === undefined) {
          return cbk([500, 'Expected channel capacity', channel]);
        }

        if (channel.local_balance === undefined) {
          return cbk([500, 'Expected local balance', channel]);
        }

        if (channel.remote_balance === undefined) {
          return cbk([500, 'Expected remote balance', channel]);
        }

        if (channel.commit_fee === undefined) {
          return cbk([500, 'Expected commit fee', channel]);
        }

        if (channel.commit_weight === undefined) {
          return cbk([500, 'Expected commit weight', channel]);
        }

        if (channel.fee_per_kw === undefined) {
          return cbk([500, 'Expected fee per kw', channel]);
        }

        if (channel.unsettled_balance === undefined) {
          return cbk([500, 'Expected unsettled balance', channel]);
        }

        if (channel.total_satoshis_sent === undefined) {
          return cbk([500, 'Expected total satoshis sent', channel]);
        }

        if (channel.total_satoshis_received === undefined) {
          return cbk([500, 'Expected total satoshis received', channel]);
        }

        if (channel.num_updates === undefined) {
          return cbk([500, 'Expected num updates', channel]);
        }

        const [transactionId, vout] = channel.channel_point.split(':');

        return cbk(null, {
          capacity: parseInt(channel.capacity),
          commit_transaction_fee: parseInt(channel.commit_fee),
          commit_transaction_weight: parseInt(channel.commit_weight),
          id: channel.chan_id,
          is_active: channel.active,
          is_closing: false,
          is_opening: false,
          local_balance: parseInt(channel.local_balance),
          partner_public_key: channel.remote_pubkey,
          received: parseInt(channel.total_satoshis_received),
          remote_balance: parseInt(channel.remote_balance),
          sent: parseInt(channel.total_satoshis_sent),
          transaction_id: transactionId,
          transaction_vout: parseInt(vout),
          transfers_count: parseInt(channel.num_updates),
          unsettled_balance: parseInt(channel.unsettled_balance),
        });
      },
      cbk);
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, res.channels);
  });
};

