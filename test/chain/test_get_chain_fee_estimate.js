const {test} = require('@alexbosworth/tap');

const {getChainFeeEstimate} = require('./../../');

const tests = [
  {
    args: {},
    description: 'LND Object is required to get chain fee estimate',
    error: [400, 'ExpectedLndToEstimateChainFee'],
  },
  {
    args: {lnd: {default: {estimateFee: ({}, cbk) => cbk()}}},
    description: 'Send to addresses are required to estimate fee',
    error: [400, 'ExpectedSendToAddressesToEstimateChainFee'],
  },
  {
    args: {lnd: {default: {estimateFee: ({}, cbk) => cbk()}}, send_to: []},
    description: 'A send to address is required to estimate chain fee',
    error: [400, 'ExpectedSendToAddressesToEstimateChainFee'],
  },
  {
    args: {lnd: {default: {estimateFee: ({}, cbk) => cbk()}}, send_to: ['']},
    description: 'A valid send to address is required to estimate chain fee',
    error: [400, 'ExpectedSendToAddressInEstimateChainFee'],
  },
  {
    args: {
      lnd: {default: {estimateFee: ({}, cbk) => cbk('err')}},
      send_to: [{address: 'address'}],
    },
    description: 'Send to tokens are required to estimate chain fee',
    error: [400, 'ExpectedSendToTokensInEstimateChainFee'],
  },
  {
    args: {
      lnd: {default: {estimateFee: ({}, cbk) => cbk('err')}},
      send_to: [{address: 'address', tokens: 1}],
    },
    description: 'An error is pased back from fee estimate',
    error: [503, 'UnexpectedErrEstimatingFeeForChainSend', {err: 'err'}],
  },
  {
    args: {
      lnd: {default: {estimateFee: ({}, cbk) => cbk()}},
      send_to: [{address: 'address', tokens: 1}],
    },
    description: 'A response is expected from fee estimate',
    error: [503, 'ExpectedResponseFromEstimateFeeApi'],
  },
  {
    args: {
      lnd: {default: {estimateFee: ({}, cbk) => cbk(null, {})}},
      send_to: [{address: 'address', tokens: 1}],
    },
    description: 'Fee sat is expected in estimate fee response',
    error: [503, 'ExpectedChainFeeInResponseToChainFeeEstimate'],
  },
  {
    args: {
      lnd: {default: {estimateFee: ({}, cbk) => cbk(null, {fee_sat: '1'})}},
      send_to: [{address: 'address', tokens: 1}],
    },
    description: 'Fee rate is expected in estimate fee response',
    error: [503, 'ExpectedFeeRateValueInChainFeeEstimateQuery'],
  },
  {
    args: {
      lnd: {
        default: {
          estimateFee: ({}, cbk) => cbk(null, {
            fee_sat: '1',
            feerate_sat_per_byte: '1',
          }),
        },
      },
      send_to: [{address: 'address', tokens: 1}],
    },
    description: 'Fee rate and fee are given in chain response',
    expected: {fee: 1, tokens_per_vbyte: 1},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getChainFeeEstimate(args), error, 'Got expected error');
    } else {
      const estimate = await getChainFeeEstimate(args);

      deepEqual(estimate, expected, 'Got chain fee estimate');
    }

    return end();
  });
});
