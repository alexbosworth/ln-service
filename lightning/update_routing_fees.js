const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const defaultBaseFee = 1;
const defaultCltvDelta = 40;
const defaultFeeRate = 1;
const feeRatio = 1e6;
const {floor} = Math;
const tokPerMtok = 1e3;

/** Update routing fees on a single channel or on all channels

  {
    [base_fee_tokens]: <Base Fee Charged Tokens Number>
    [cltv_delta]: <CLTV Delta Number>
    [fee_rate]: <Fee Rate In Millitokens Per Million Number>
    lnd: <Authenticated LND gRPC API Object>
    [transaction_id]: <Channel Transaction Id String>
    [transaction_vout]: <Channel Transaction Output Index Number>
  }

  @returns via cbk or Promise
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.default) {
          return cbk([400, 'ExpectedLndForRoutingFeesUpdate']);
        }

        const isGlobal = !args.transaction_id && !args.transaction_vout;

        if (!!isGlobal && args.transaction_id) {
          return cbk([400, 'UnexpectedTransactionIdForGlobalFeeUpdate']);
        }

        if (!!isGlobal && args.transaction_vout) {
          return cbk([400, 'UnexpectedTxOutputIndexForGlobalFeeUpdate']);
        }

        return cbk();
      },

      updateFees: ['validate', ({}, cbk) => {
        const baseFee = (args.base_fee_tokens || defaultBaseFee) * tokPerMtok;
        const i = args.transaction_vout || undefined;
        const id = args.transaction_id || undefined;
        const isGlobal = !args.transaction_id && !args.transaction_vout;

        const chan = {funding_txid_str: id, output_index: i};

        return args.lnd.default.updateChannelPolicy({
          base_fee_msat: baseFee.toString(),
          chan_point: !isGlobal ? chan : undefined,
          fee_rate: ((args.fee_rate || defaultFeeRate) / feeRatio),
          global: isGlobal || undefined,
          time_lock_delta: args.cltv_delta || defaultCltvDelta,
        },
        err => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorUpdatingRoutingFees', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
