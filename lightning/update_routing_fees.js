const defaultBaseFee = 1;
const defaultCltvDelta = 40;
const defaultFeeRate = 1;
const feeRatio = 1e6;
const {floor} = Math;
const tokensPerMTokens = 1e3;

/** Update routing fees on a single channel or on all channels

  {
    [base_fee_tokens]: <Base Fee Charged Tokens Number>
    [cltv_delta]: <CLTV Delta Number>
    [fee_rate]: <Fee Rate In Millitokens Per Million Number>
    lnd: <Authenticated LND gRPC API Object>
    [transaction_id]: <Channel Transaction Id String>
    [transaction_vout]: <Channel Transaction Output Index Number>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd || !args.lnd.default) {
    return cbk([400, 'ExpectedLndForRoutingFeesUpdate']);
  }

  const isGlobal = !args.transaction_id && !args.transaction_vout;

  if (!!isGlobal && args.transaction_id) {
    return cbk([400, 'UnexpectedTransactionIdForGlobalFeeUpdate']);
  }

  if (!!isGlobal && args.transaction_vout) {
    return cbk([400, 'UnexpectedTransactionOutputIndexForGlobalFeeUpdate']);
  }

  const baseFee = (args.base_fee_tokens || defaultBaseFee) * tokensPerMTokens;
  const i = args.transaction_vout || undefined;
  const id = args.transaction_id || undefined;

  const chan = !isGlobal ? {funding_txid_str: id, output_index: i} : undefined;

  return args.lnd.default.updateChannelPolicy({
    base_fee_msat: baseFee.toString(),
    chan_point: chan,
    fee_rate: floor((args.fee_rate || defaultFeeRate) / feeRatio),
    global: isGlobal || undefined,
    time_lock_delta: args.cltv_delta || defaultCltvDelta,
  },
  err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorUpdatingRoutingFees', {err}]);
    }

    return cbk();
  });
};
