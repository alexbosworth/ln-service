const {test} = require('tap');

const chanPolicyAsPolicy = require('./../../graph/channel_policy_as_policy');

const tests = [
  {
    args: {},
    description: 'A public key is required',
    error: 'ExpectedPublicKeyForChannelPolicy',
  },
  {
    args: {public_key: '00', policy: {}},
    description: 'Enabled status is required',
    error: 'ExpectedChannelPolicyDisabledStatus',
  },
  {
    args: {public_key: '00', policy: {disabled: false}},
    description: 'Base fee is required',
    error: 'ExpectedChannelPolicyBaseFee',
  },
  {
    args: {public_key: '00', policy: {disabled: false, fee_base_msat: '1'}},
    description: 'Fee rate is required',
    error: 'ExpectedChannelPolicyFeeRate',
  },
  {
    args: {
      public_key: '00',
      policy: {disabled: false, fee_base_msat: '1', fee_rate_milli_msat: '1'},
    },
    description: 'Last update is required',
    error: 'ExpectedPolicyLastUpdateInChannelPolicy',
  },
  {
    args: {
      public_key: '00',
      policy: {
        disabled: false,
        fee_base_msat: '1',
        fee_rate_milli_msat: '1',
        last_update: 1,
      },
    },
    description: 'Max HTLC is required',
    error: 'ExpectedChannelPolicyMaximumHtlcValue',
  },
  {
    args: {
      public_key: '00',
      policy: {
        disabled: false,
        fee_base_msat: '1',
        fee_rate_milli_msat: '1',
        last_update: 1,
        max_htlc_msat: '1',
      },
    },
    description: 'Min HTLC is required',
    error: 'ExpectedChannelPolicyMinimumHtlcValue',
  },
  {
    args: {
      public_key: '00',
      policy: {
        disabled: false,
        fee_base_msat: '1',
        fee_rate_milli_msat: '1',
        last_update: 1,
        max_htlc_msat: '1',
        min_htlc: '1',
      },
    },
    description: 'CLTV delta is required',
    error: 'ExpectedChannelNodePolicyTimelockDelta',
  },
  {
    args: {public_key: '00'},
    description: 'Empty policy is mapped',
    expected: {public_key: '00'},
  },
  {
    args: {
      public_key: '00',
      policy: {
        disabled: false,
        fee_base_msat: '1',
        fee_rate_milli_msat: '1',
        last_update: 1,
        max_htlc_msat: '1',
        min_htlc: '1',
        time_lock_delta: 1,
      },
    },
    description: 'Policy mapped',
    expected: {
      base_fee_mtokens: '1',
      cltv_delta: 1,
      fee_rate: 1,
      is_disabled: false,
      max_htlc_mtokens: '1',
      min_htlc_mtokens: '1',
      public_key: '00',
      updated_at: new Date(1000).toISOString(),
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepEqual, end, equal, throws}) => {
    if (!!error) {
      throws(() => chanPolicyAsPolicy(args), new Error(error), 'Got error');
    } else {
      const policy = chanPolicyAsPolicy(args);

      deepEqual(policy, expected, 'Raw policy cast as policy');
    }

    return end();
  });
});
