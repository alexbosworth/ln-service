const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const decBase = 10;
const {isArray} = Array;
const notFound = -1;

/** Get a chain fee estimate for a prospective chain send

  Requires `onchain:read` permission

  {
    lnd: <Authenticated LND API Object>
    send_to: [{
      address: <Address String>
      tokens: <Tokens Number>
    }]
    [target_confirmations]: <Target Confirmations Number>
  }

  @returns via cbk or Promise
  {
    fee: <Total Fee Tokens Number>
    tokens_per_vbyte: <Fee Tokens Per VByte Number>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({lnd: args.lnd, type: 'default', method: 'estimateFee'})) {
          return cbk([400, 'ExpectedLndToEstimateChainFee']);
        }

        if (!isArray(args.send_to) || !args.send_to.length) {
          return cbk([400, 'ExpectedSendToAddressesToEstimateChainFee']);
        }

        // Confirm send_to array has addresses
        if (args.send_to.findIndex(({address}) => !address) !== notFound) {
          return cbk([400, 'ExpectedSendToAddressInEstimateChainFee']);
        }

        // Confirm send_to array has tokens
        if (args.send_to.findIndex(({tokens}) => !tokens) !== notFound) {
          return cbk([400, 'ExpectedSendToTokensInEstimateChainFee']);
        }

        return cbk();
      },

      // Get fee estimate
      getEstimate: ['validate', ({}, cbk) => {
        const AddrToAmount = {};

        args.send_to.forEach(({address, tokens}) => {
          return AddrToAmount[address] = tokens;
        });

        return args.lnd.default.estimateFee({
          AddrToAmount,
          target_conf: args.target_confirmations || undefined,
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrEstimatingFeeForChainSend', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseFromEstimateFeeApi']);
          }

          if (!res.fee_sat) {
            return cbk([503, 'ExpectedChainFeeInResponseToChainFeeEstimate']);
          }

          if (!res.feerate_sat_per_byte) {
            return cbk([503, 'ExpectedFeeRateValueInChainFeeEstimateQuery']);
          }

          return cbk(null, {
            fee: parseInt(res.fee_sat, decBase),
            tokens_per_vbyte: parseInt(res.feerate_sat_per_byte, decBase),
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getEstimate'}, cbk));
  });
};
