const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const defaultBaseFee = 1;
const defaultCltvDelta = 40;
const defaultFeeRate = 1;
const feeRatio = 1e6;
const {floor} = Math;
const tokPerMtok = 1e3;

/** Update routing fees on a single channel or on all channels

  Requires `offchain:write` permission

  Updating the maximum HTLC size is not supported on LND 0.7.1 and below
  Updating the minimum HTLC size is not supported on LND 0.8.2 and below

  {
    [base_fee_tokens]: <Base Fee Tokens Charged Number>
    [cltv_delta]: <HTLC CLTV Delta Number>
    [fee_rate]: <Fee Rate In Millitokens Per Million Number>
    lnd: <Authenticated LND gRPC API Object>
    [max_htlc_mtokens]: <Maximum HTLC Millitokens to Forward String>
    [min_htlc_mtokens]: <Minimum HTLC Millitokens to Forward String>
    [transaction_id]: <Channel Funding Transaction Id String>
    [transaction_vout]: <Channel Funding Transaction Output Index Number>
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

        if (args.transaction_vout !== undefined && !args.transaction_id) {
          return cbk([400, 'UnexpectedTransactionIdForGlobalFeeUpdate']);
        }

        if (!!args.transaction_id && args.transaction_vout === undefined) {
          return cbk([400, 'UnexpectedTxOutputIndexForGlobalFeeUpdate']);
        }

        return cbk();
      },

      updateFees: ['validate', ({}, cbk) => {
        const baseFee = (args.base_fee_tokens || defaultBaseFee) * tokPerMtok;
        const id = args.transaction_id || undefined;
        const vout = args.transaction_vout;

        const isGlobal = !args.transaction_id && vout === undefined;

        const chan = {
          funding_txid_str: id,
          output_index: vout === undefined ? undefined : vout,
        };

        return args.lnd.default.updateChannelPolicy({
          base_fee_msat: baseFee.toString(),
          chan_point: !isGlobal ? chan : undefined,
          fee_rate: ((args.fee_rate || defaultFeeRate) / feeRatio),
          global: isGlobal || undefined,
          max_htlc_msat: args.max_htlc_mtokens || undefined,
          min_htlc_msat: args.min_htlc_mtokens || undefined,
          min_htlc_msat_specified: !!args.min_htlc_mtokens,
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
