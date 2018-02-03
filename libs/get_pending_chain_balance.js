const asyncAuto = require('async/auto');

const intBase = 10;

/** Get pending chain balance.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  <Pending Chain Balance Satoshis Number>
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    validate: cbk => {
      if (!args.lnd_grpc_api) {
        return cbk([500, 'Missing lnd grpc api', args]);
      }

      return cbk();
    },

    channelsLimboBalance: ['validate', (res, cbk) => {
      return args.lnd_grpc_api.pendingChannels({}, (err, res) => {
        if (!!err) { return cbk([500, 'Get pending channels error', err]); }

        if (!res || res.total_limbo_balance === undefined) {
          return cbk([500, 'Expected total limbo balance', res]);
        }

        return cbk(null, parseInt(res.total_limbo_balance, intBase));
      });
    }],

    unconfirmedChainBalance: ['validate', (res, cbk) => {
      return args.lnd_grpc_api.walletBalance({}, (err, res) => {
        if (!!err) { return cbk([500, 'Get chain balance error', err]); }

        if (!res || res.total_balance === undefined) {
          return cbk([500, 'Expected balance', res]);
        }

        return cbk(null, parseInt(res.unconfirmed_balance, intBase));
      });
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, res.channelsLimboBalance + res.unconfirmedChainBalance);
  });
};

