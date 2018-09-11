const asyncAuto = require('async/auto');

const getChainBalance = require('./../getChainBalance');
const getChannelBalance = require('./../getChannelBalance');
const getPendingChainBalance = require('./../getPendingChainBalance');
const getPendingChannels = require('./../getPendingChannels');
const {returnResult} = require('./../async-util');
const {rowTypes} = require('./../lightning');

/** Get both the chain and channel balance totals.

  {
    lnd: <LND GRPC API Object>
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
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Get chain balances
    getChainBalance: async cbk => getChainBalance({lnd}),

    // Get channel balances
    getChannelBalance: async cbk => getChannelBalance({lnd}),

    // Get pending chain balances
    getPendingChain: async cbk => getPendingChainBalance({lnd}),

    // Get pending channels
    getPendingChannels: async cbk => getPendingChannels({lnd}),

    // Pending channel balance
    pendingChanBalance: ['getPendingChannels', ({getPendingChannels}, cbk) => {
      const pendingChannelBalance = getPendingChannels.pending_channels
        .filter(channel => channel.is_opening)
        .map(channel => channel.local_balance)
        .reduce((sum, val) => sum + val, 0);

      return cbk(null, pendingChannelBalance);
    }],

    // Final balances
    balances: [
      'getChainBalance',
      'getChannelBalance',
      'getPendingChain',
      'pendingChanBalance',
      (res, cbk) =>
    {
      return cbk(null, {
        chain_balance: res.getChainBalance.chain_balance,
        channel_balance: res.getChannelBalance.channel_balance,
        pending_chain_balance: res.getPendingChain.pending_chain_balance,
        pending_channel_balance: res.pendingChanBalance,
        type: rowTypes.balances,
      });
    }],
  },
  returnResult({of: 'balances'}, cbk));
};

