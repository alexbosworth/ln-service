const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const defaultBaseFee = 1;
const defaultCltvDelta = 40;
const defaultRate = 1;
const feeRatio = 1e6;
const {floor} = Math;
const method = 'updateChannelPolicy';
const tokensAsMtokens = tokens => (BigInt(tokens) * BigInt(1e3)).toString();
const type = 'default';

/** Update routing fees on a single channel or on all channels

  Setting both `base_fee_tokens` and `base_fee_mtokens` is not supported

  Requires `offchain:write` permission

  Updating the maximum HTLC size is not supported on LND 0.7.1 and below
  Updating the minimum HTLC size is not supported on LND 0.8.2 and below

  {
    [base_fee_mtokens]: <Base Fee Millitokens Charged Number>
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
        if (!!args.base_fee_mtokens && args.base_fee_tokens !== undefined) {
          return cbk([400, 'ExpectedEitherBaseFeeMtokensOrTokensNotBoth']);
        }

        if (!isLnd({method, type, lnd: args.lnd})) {
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

      // Determine what base fee rate to use
      baseFeeMillitokens: ['validate', ({}, cbk) => {
        if (!!args.base_fee_mtokens) {
          return cbk(null, args.base_fee_mtokens);
        }

        if (args.base_fee_tokens === undefined) {
          return cbk(null, tokensAsMtokens(defaultBaseFee));
        }

        return cbk(null, tokensAsMtokens(args.base_fee_tokens));
      }],

      // Set the routing fee policy
      updateFees: ['baseFeeMillitokens', ({baseFeeMillitokens}, cbk) => {
        const id = args.transaction_id || undefined;
        const rate = args.fee_rate === undefined ? defaultRate : args.fee_rate;
        const vout = args.transaction_vout;

        const isGlobal = !args.transaction_id && vout === undefined;

        const chan = {
          funding_txid_str: id,
          output_index: vout === undefined ? undefined : vout,
        };

        return args.lnd[type][method]({
          base_fee_msat: baseFeeMillitokens,
          chan_point: !isGlobal ? chan : undefined,
          fee_rate: rate / feeRatio,
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
