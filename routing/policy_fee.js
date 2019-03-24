const rateDivisor = 1e6;

/** Fee for policy

  {
    mtokens: <Millitokens String>
    policy: {
      base_fee_mtokens: <Base Fee Millitokens String>
      fee_rate: <Fee Rate Number>
    }
  }

  @throws
  <Error>

  @returns
  {
    fee_mtokens: <Fee Millitokens String>
  }
*/
module.exports = ({mtokens, policy}) => {
  if (mtokens === undefined) {
    throw new Error('ExpectedMillitokensForPolicyFeeCalculation');
  }

  if (!policy.base_fee_mtokens) {
    throw new Error('ExpectedBaseFeeMillitokensForPolicyFeeCalculation');
  }

  if (policy.fee_rate === undefined) {
    throw new Error('ExpectedFeeRateForPolicyFeeCalculation');
  }

  const baseFeeMtokens = BigInt(policy.base_fee_mtokens);
  const feeRate = BigInt(policy.fee_rate);
  const forwardMtokens = BigInt(mtokens);

  const feeRateMtokens = forwardMtokens * feeRate / BigInt(rateDivisor);

  const fee = baseFeeMtokens + feeRateMtokens;

  return {fee_mtokens: fee.toString()};
};
