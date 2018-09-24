const asyncAuto = require('async/auto');

const {returnResult} = require('./../async-util');

const decBase = 10;

/** Get pending chain balance.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    pending_chain_balance: <Pending Chain Balance Tokens Number>
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!lnd || !lnd.pendingChannels || !lnd.walletBalance) {
        return cbk([400, 'ExpectedLndForPendingChainBalance']);
      }

      return cbk();
    },

    // Determine the balance that is still in timelocks
    channelsLimboBalance: ['validate', ({}, cbk) => {
      return lnd.pendingChannels({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'GetPendingChannelsErr', err]);
        }

        if (!res || res.total_limbo_balance === undefined) {
          return cbk([503, 'ExpectedTotalLimboBalance', res]);
        }

        return cbk(null, parseInt(res.total_limbo_balance, decBase));
      });
    }],

    // Determine the balance that is in unconfirmed chain outputs
    unconfirmedChainBalance: ['validate', ({}, cbk) => {
      return lnd.walletBalance({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'GetChainBalanceError', err]);
        }

        if (!res || res.unconfirmed_balance === undefined) {
          return cbk([503, 'ExpectedUnconfirmedBalance', res]);
        }

        return cbk(null, parseInt(res.unconfirmed_balance, decBase));
      });
    }],

    // Sum the chain balance with the timelocked balance
    pendingChainBalance: [
      'channelsLimboBalance',
      'unconfirmedChainBalance',
      (res, cbk) =>
    {
      const balance = res.channelsLimboBalance + res.unconfirmedChainBalance;

      return cbk(null, {pending_chain_balance: balance});
    }],
  },
  returnResult({of: 'pendingChainBalance'}, cbk));
};

