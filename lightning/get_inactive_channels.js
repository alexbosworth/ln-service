const asyncAuto = require('async/auto');
const asyncEach = require('async/each');
const asyncFilterSeries = require('async/filterSeries');

const getChannels = require('./get_channels');
const getNode = require('./get_node');
const {returnResult} = require('./../async-util');

/** Get inactive channels attached to inactive nodes

  {
    inactive_since: <Last Update Before ISO 8601 Date String>
    lnd: <LND GRPC API Object>
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
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.inactive_since) {
        return cbk([400, 'ExpectedInactiveSinceDate']);
      }

      if (!args.lnd) {
        return cbk([400, 'ExpectedLndGrpcObjectForInactiveChannelClosing']);
      }

      return cbk();
    },

    // List all inactive channels
    getChannels: ['validate', ({}, cbk) => {
      return getChannels({is_inactive: true, lnd: args.lnd}, cbk);
    }],

    // Get inactive channels
    getInactive: ['getChannels', ({getChannels}, cbk) => {
      const inactiveChannels = getChannels.channels.filter(n => !n.is_active);

      return asyncFilterSeries(inactiveChannels, (chan, cbk) => {
        const publicKey = chan.partner_public_key;

        return getNode({lnd: args.lnd, public_key: publicKey}, (err, node) => {
          if (!!err) {
            return cbk(err);
          }

          return cbk(null, node.updated_at < args.inactive_since);
        });
      },
      cbk);
    }],

    // Final channels list
    channels: ['getInactive', ({getInactive}, cbk) => {
      return cbk(null, {channels: getInactive});
    }],
  },
  returnResult({of: 'channels'}, cbk));
};

