const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const decBase = 10;
const defaultConfirmationTarget = 6;
const weightPerKWeight = 1e3;
const weightPerVByte = 4;

/** Get chain fee rate estimate

  {
    [confirmation_target]: <Future Blocks Confirmation Number>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    tokens_per_vbyte: <Tokens Per Virtual Byte Number>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.wallet || !args.lnd.wallet.estimateFee) {
          return cbk([400, 'ExpecteAuthenticatedLndToGetFeeEstimate']);
        }

        return cbk();
      },

      // Get fee rate
      getRate: ['validate', ({}, cbk) => {
        const confs = args.confirmation_target || defaultConfirmationTarget;

        return args.lnd.wallet.estimateFee({
          conf_target: confs,
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingFeeFromLnd', {err}]);
          }

          if (!res || !res.sat_per_kw) {
            return cbk([503, 'ExpectedSatPerKwResponseForFeeEstimate']);
          }

          const satsPerKw = parseInt(res.sat_per_kw, decBase);

          const tokensPerVByte = satsPerKw * weightPerVByte / weightPerKWeight;

          return cbk(null, {tokens_per_vbyte: tokensPerVByte});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getRate'}, cbk));
  });
};
