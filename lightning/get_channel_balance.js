const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const decBase = 10;

/** Get balance across channels.

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    channel_balance: <Channels Balance Tokens Number>
    pending_balance: <Pending Channels Balance Tokens Number>
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.default || !lnd.default.channelBalance) {
          return cbk([400, 'ExpectedLndGrpcApiForChannelBalanceQuery']);
        }

        return cbk();
      },

      // Get channel balance
      getChannelBalance: ['validate', ({}, cbk) => {
        return lnd.default.channelBalance({}, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedGetChannelBalanceError', err]);
          }

          if (!res) {
            return cbk([503, 'ExpectedGetChannelBalanceResponse']);
          }

          if (res.balance === undefined) {
            return cbk([503, 'ExpectedChannelBalance']);
          }

          if (res.pending_open_balance === undefined) {
            return cbk([503, 'ExpectedPendingOpenBalance']);
          }

          return cbk(null, {
            channel_balance: parseInt(res.balance, decBase),
            pending_balance: parseInt(res.pending_open_balance, decBase),
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getChannelBalance'}, cbk));
  });
};
