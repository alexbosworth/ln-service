const asyncAuto = require('async/auto');

const getChainBalance = require('./get_chain_balance');
const getChannelBalance = require('./get_channel_balance');
const rowTypes = require('./../config/row_types');

/** Get both the chain and channel balance totals.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  {
    chain_balance: <Satoshis Number>
    channel_balance: <Satoshis Number>
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

    balance: ['getChainBalance', 'getChannelBalance', (res, cbk) => {
      return cbk(null, {
        chain_balance: res.getChainBalance,
        channel_balance: res.getChannelBalance,
        type: rowTypes.balances,
      });
    }],
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    return cbk(null, res.balance);
  });
};

