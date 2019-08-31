const rateDivisor = BigInt(1e6);

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

  if (!policy) {
    throw new Error('ExpectedPolicyToCalculateFeeFor');
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

  const fee = baseFeeMtokens + forwardMtokens * feeRate / rateDivisor;

  return {fee_mtokens: fee.toString()};
};
