const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {getChainBalance} = require('./../');
const {getChannelBalance} = require('./../');
const {getPendingChainBalance} = require('./../');
const {getPendingChannels} = require('./../');

/** Get both the chain and channel balance totals.

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
  {
    chain_balance: <Tokens Number>
    channel_balance: <Tokens Number>
    pending_chain_balance: <Tokens Number>
    pending_channel_balance: <Tokens Number>
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
      });
    }],
  },
  returnResult({of: 'balances'}, cbk));
};
