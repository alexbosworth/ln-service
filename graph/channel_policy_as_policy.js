const asDate = epochTime => new Date(epochTime * 1e3).toISOString();
const decBase = 10;

/** Convert raw channel policy to standard channel policy

  {
    [policy]: {
      disabled: <Forwarding is Disabled Bool>
      fee_base_msat: <Base Fee Tokens String>
      fee_rate_milli_msat: <Fee Rate Number String>
      last_update: <Last Update Epoch Time Seconds Number>
      max_htlc_msat: <Maximum HTLC Millitokens String>
      min_htlc: <Minimum HTLC Millitokens String>
      time_lock_delta: <CLTV Delta Number>
    }
    public_key: <Policy Author Public Key Hex String>
  }

  @throws
  <Error>

  @returns
  {
    base_fee_mtokens: <Base Fee Millitokens String>
    cltv_delta: <Forward CLTV Delta Number>
    fee_rate: <Fee Rate in Parts Per Millitoken Number>
    is_disabled: <Forwarding Is Disabled Bool>
    max_htlc_mtokens: <Maximum Forward Millitokens String>
    min_htlc_mtokens: <Minimum Forward Millitokens String>
    public_key: <Policy Author Public Key Hex String>
    updated_at: <Policy Last Updated At ISO 8601 Date String>
  }
*/
module.exports = args => {
  if (!args.public_key) {
    throw new Error('ExpectedPublicKeyForChannelPolicy');
  }

  // Exit early when there is no associated policy
  if (!args.policy) {
    return {public_key: args.public_key};
  }

  if (args.policy.disabled === undefined) {
    throw new Error('ExpectedChannelPolicyDisabledStatus');
  }

  if (!args.policy.fee_base_msat) {
    throw new Error('ExpectedChannelPolicyBaseFee');
  }

  if (!args.policy.fee_rate_milli_msat) {
    throw new Error('ExpectedChannelPolicyFeeRate');
  }

  if (!args.policy.last_update) {
    throw new Error('ExpectedPolicyLastUpdateInChannelPolicy');
  }

  if (!args.policy.max_htlc_msat) {
    throw new Error('ExpectedChannelPolicyMaximumHtlcValue');
  }

  if (!args.policy.min_htlc) {
    throw new Error('ExpectedChannelPolicyMinimumHtlcValue');
  }

  if (args.policy.time_lock_delta === undefined) {
    throw new Error('ExpectedChannelNodePolicyTimelockDelta');
  }

  return {
    base_fee_mtokens: args.policy.fee_base_msat,
    cltv_delta: args.policy.time_lock_delta,
    fee_rate: parseInt(args.policy.fee_rate_milli_msat, decBase),
    is_disabled: args.policy.disabled,
    max_htlc_mtokens: args.policy.max_htlc_msat,
    min_htlc_mtokens: args.policy.min_htlc,
    public_key: args.public_key,
    updated_at: asDate(args.policy.last_update),
  };
};
