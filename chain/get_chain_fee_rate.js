const decBase = 10;
const defaultConfirmationTarget = 6;
const weightPerKWeight = 1e3;
const weightPerVByte = 4;

/** Get chain fee rate estimate

  {
    [confirmation_target]: <Future Blocks Confirmation Number>
    lnd: <Wallet LND GRPC API Object>
  }

  @returns via cbk
  {
    tokens_per_vbyte: <Tokens Per Virtual Byte Number>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd) {
    return cbk([400, 'ExpectedWalletLndToGetFeeEstimate']);
  }

  const confs = args.confirmation_target || defaultConfirmationTarget;

  return args.lnd.estimateFee({conf_target: confs}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorGettingFeeFromLnd']);
    }

    if (!res || !res.sat_per_kw) {
      return cbk([503, 'ExpectedSatPerKwResponseForFeeEstimate']);
    }

    const satsPerKw = parseInt(res.sat_per_kw, decBase);

    const tokensPerVByte = satsPerKw * weightPerVByte / weightPerKWeight;

    return cbk(null, {tokens_per_vbyte: tokensPerVByte});
  });
};
