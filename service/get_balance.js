const asyncAuto = require('async/auto');

const {getChainBalance} = require('./../lightning');
const {getChannelBalance} = require('./../lightning');
const {getPendingChainBalance} = require('./../lightning');
const {getPendingChannels} = require('./../lightning');
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
    getChainBalance: cbk => getChainBalance({lnd}, cbk),

    // Get channel balances
    getChannelBalance: cbk => getChannelBalance({lnd}, cbk),

    // Get pending chain balances
    getPendingChain: cbk => getPendingChainBalance({lnd}, cbk),

    // Get pending channels
    getPendingChannels: cbk => getPendingChannels({lnd}, cbk),

    // Pending channel balance
    pendingChannelBalance: ['getPendingChannels', (res, cbk) => {
      const pendingChannelBalance = res.getPendingChannels.pending_channels
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
      'pendingChannelBalance',
      (res, cbk) =>
    {
      return cbk(null, {
        chain_balance: res.getChainBalance.chain_balance,
        channel_balance: res.getChannelBalance.channel_balance,
        pending_chain_balance: res.getPendingChain.pending_chain_balance,
        pending_channel_balance: res.pendingChannelBalance,
        type: rowTypes.balances,
      });
    }],
  },
  returnResult({of: 'balances'}, cbk));
};

