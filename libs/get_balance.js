const asyncAuto = require('async/auto');

const getChainBalance = require('./get_chain_balance');
const getChannelBalance = require('./get_channel_balance');
const getPendingChainBalance = require('./get_pending_chain_balance');
const getPendingChannels = require('./get_pending_channels');
const rowTypes = require('./../config/row_types');

/** Get both the chain and channel balance totals.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  {
    chain_balance: <Satoshis Number>
    channel_balance: <Satoshis Number>
    pending_chain_balance: <Satoshis Number>
    pending_channel_balance: <Satoshis Number>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return asyncAuto({
    getChainBalance: (cbk) => {
      return getChainBalance({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    getChannelBalance: (cbk) => {
      return getChannelBalance({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    getPendingChainBalance: (cbk) => {
      return getPendingChainBalance({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    getPendingChannels: (cbk) => {
      return getPendingChannels({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    pendingChannelBalance: ['getPendingChannels', (res, cbk) => {
      const pendingChannelBalance = res.getPendingChannels
        .filter((channel) => channel.is_opening)
        .map((channel) => channel.local_balance)
        .reduce((sum, val) => sum + val, 0);

      return cbk(null, pendingChannelBalance);
    }],

    balance: [
      'getChainBalance',
      'getChannelBalance',
      'getPendingChainBalance',
      'pendingChannelBalance',
      (res, cbk) =>
    {
      return cbk(null, {
        chain_balance: res.getChainBalance,
        channel_balance: res.getChannelBalance,
        pending_chain_balance: res.getPendingChainBalance,
        pending_channel_balance: res.pendingChannelBalance,
        type: rowTypes.balances,
      });
    }],
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    return cbk(null, res.balance);
  });
};

