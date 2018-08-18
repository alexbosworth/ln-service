const asyncAuto = require('async/auto');
const asyncMap = require('async/map');

const {returnResult} = require('./../async-util');

const intBase = 10;

/** Get channels

  {
    lnd: {listChannels: <Function>}
  }

  @returns via cbk
  {
    channels: [{
      capacity: <Channel Token Capacity Number>
      commit_transaction_fee: <Commit Transaction Fee Number>
      commit_transaction_weight: <Commit Transaction Weight Number>
      id: <Channel Id String>
      is_active: <Channel Active Bool>
      is_closing: <Channel Is Closing Bool>
      is_opening: <Channel Is Opening Bool>
      is_private: <Channel Is Private Bool>
      local_balance: <Local Balance Satoshis Number>
      partner_public_key: <Channel Partner Public Key String>
      received: <Received Satoshis Number>
      remote_balance: <Remote Balance Satoshis Number>
      sent: <Sent Satoshis Number>
      transaction_id: <Blockchain Transaction Id>
      transaction_vout: <Blockchain Transaction Vout Number>
      unsettled_balance: <Unsettled Balance Satoshis Number>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!lnd || !lnd.listChannels) {
        return cbk([400, 'ExpectedLndToGetChannels']);
      }

      return cbk();
    },

    // Get channels
    getChannels: ['validate', (_, cbk) => {
      return lnd.listChannels({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'GetChannelsErr', err, res]);
        }

        if (!res || !Array.isArray(res.channels)) {
          return cbk([503, 'ExpectedChannelsArray', res]);
        }

        return cbk(null, res.channels);
      });
    }],

    // Map channel response to channels list
    mappedChannels: ['getChannels', ({getChannels}, cbk) => {
      return asyncMap(getChannels, (channel, cbk) => {
        if (!Array.isArray(channel.pending_htlcs)) {
          return cbk([503, 'ExpectedPendingHtlcs', channel]);
        }

        if (channel.active === undefined) {
          return cbk([503, 'ExpectedChannelActiveState', channel]);
        }

        if (channel.capacity === undefined) {
          return cbk([503, 'ExpectedChannelCapacity', channel]);
        }

        if (!channel.chan_id) {
          return cbk([503, 'ExpectedChanId', channel]);
        }

        if (!channel.channel_point) {
          return cbk([503, 'ExpectedChannelPoint', channel]);
        }

        if (channel.commit_fee === undefined) {
          return cbk([503, 'ExpectedCommitFee', channel]);
        }

        if (channel.commit_weight === undefined) {
          return cbk([503, 'ExpectedCommitWeight', channel]);
        }

        if (channel.fee_per_kw === undefined) {
          return cbk([503, 'ExpectedFeePerKw', channel]);
        }

        if (channel.local_balance === undefined) {
          return cbk([503, 'ExpectedLocalBalance', channel]);
        }

        if (channel.num_updates === undefined) {
          return cbk([503, 'ExpectedNumUpdates', channel]);
        }

        if (channel.private !== true && channel.private !== false) {
          return cbk([503, 'ExpectedChannelPrivateStatus']);
        }

        if (channel.remote_balance === undefined) {
          return cbk([503, 'ExpectedRemoteBalance', channel]);
        }

        if (!channel.remote_pubkey) {
          return cbk([503, 'ExpectedRemotePubkey', channel]);
        }

        if (channel.total_satoshis_received === undefined) {
          return cbk([503, 'ExpectedTotalSatoshisReceived', channel]);
        }

        if (channel.total_satoshis_sent === undefined) {
          return cbk([503, 'ExpectedTotalSatoshisSent', channel]);
        }

        if (channel.unsettled_balance === undefined) {
          return cbk([503, 'ExpectedUnsettledBalance', channel]);
        }

        const [transactionId, vout] = channel.channel_point.split(':');

        return cbk(null, {
          capacity: parseInt(channel.capacity, intBase),
          commit_transaction_fee: parseInt(channel.commit_fee, intBase),
          commit_transaction_weight: parseInt(channel.commit_weight, intBase),
          id: channel.chan_id,
          is_active: channel.active,
          is_closing: false,
          is_opening: false,
          is_private: channel.private,
          local_balance: parseInt(channel.local_balance, intBase),
          partner_public_key: channel.remote_pubkey,
          received: parseInt(channel.total_satoshis_received, intBase),
          remote_balance: parseInt(channel.remote_balance, intBase),
          sent: parseInt(channel.total_satoshis_sent, intBase),
          transaction_id: transactionId,
          transaction_vout: parseInt(vout, intBase),
          unsettled_balance: parseInt(channel.unsettled_balance, intBase),
        });
      },
      cbk);
    }],

    // Final channels result
    channels: ['mappedChannels', ({mappedChannels}, cbk) => {
      return cbk(null, {channels: mappedChannels});
    }],
  },
  returnResult({of: 'channels'}, cbk));
};

