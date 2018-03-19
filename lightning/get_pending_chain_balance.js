const asyncAuto = require('async/auto');

const {returnResult} = require('./../async-util');

const intBase = 10;

/** Get pending chain balance.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    pending_chain_balance: <Pending Chain Balance Satoshis Number>
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    validate: cbk => {
      if (!lnd) {
        return cbk([500, 'ExpectedLnd']);
      }

      return cbk();
    },

    channelsLimboBalance: ['validate', (_, cbk) => {
      return lnd.pendingChannels({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'GetPendingChannelsErr', err]);
        }

        if (!res || res.total_limbo_balance === undefined) {
          return cbk([503, 'ExpectedTotalLimboBalance', res]);
        }

        return cbk(null, parseInt(res.total_limbo_balance, intBase));
      });
    }],

    unconfirmedChainBalance: ['validate', (_, cbk) => {
      return lnd.walletBalance({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'GetChainBalanceError', err]);
        }

        if (!res || res.unconfirmed_balance === undefined) {
          return cbk([503, 'ExpectedUnconfirmedBalance', res]);
        }

        return cbk(null, parseInt(res.unconfirmed_balance, intBase));
      });
    }],

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

