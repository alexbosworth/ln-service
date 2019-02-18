const decBase = 10;
const {floor} = Math;
const rateDivisor = 1e6;

/** Fee for policy

  {
    mtokens: <Millitokens Number>
    policy: {
      base_fee_mtokens: <Base Fee Millitokens String>
      fee_rate: <Fee Rate Number>
    }
  }

  @throws
  <Error>

  @returns
  {
    fee: <Fee Millitokens String>
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

  const baseFeeMtokens = parseInt(policy.base_fee_mtokens, decBase);
  const feeRateMtokens = floor(mtokens * policy.fee_rate / rateDivisor);

  return {fee: baseFeeMtokens + feeRateMtokens};
};
