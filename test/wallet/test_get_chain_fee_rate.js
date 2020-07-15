const {test} = require('@alexbosworth/tap');

const {getChainFeeRate} = require('./../../');

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpecteAuthenticatedLndToGetFeeEstimate'],
  },
  {
    args: {lnd: {}},
    description: 'LND with wallet object is required',
    error: [400, 'ExpecteAuthenticatedLndToGetFeeEstimate'],
  },
  {
    args: {lnd: {wallet: {}}},
    description: 'LND with estimateFee method is required',
    error: [400, 'ExpecteAuthenticatedLndToGetFeeEstimate'],
  },
  {
    args: {
      lnd: {wallet: {estimateFee: ({}, cbk) => cbk('err')}},
    },
    description: 'Unexpected errors are passed back',
    error: [503, 'UnexpectedErrorGettingFeeFromLnd', {err: 'err'}],
  },
  {
    args: {
      lnd: {wallet: {estimateFee: ({}, cbk) => cbk()}},
    },
    description: 'A response is expected',
    error: [503, 'ExpectedSatPerKwResponseForFeeEstimate'],
  },
  {
    args: {
      lnd: {wallet: {estimateFee: ({}, cbk) => cbk(null, {})}},
    },
    description: 'A response is expected',
    error: [503, 'ExpectedSatPerKwResponseForFeeEstimate'],
  },
  {
    args: {
      lnd: {
        wallet: {estimateFee: ({}, cbk) => cbk(null, {sat_per_kw: '250'})},
      },
    },
    description: 'Tokens per vbyte are returned',
    expected: {tokens_per_vbyte: 1},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      await rejects(getChainFeeRate(args), error, 'Got expected error');
    } else {
      const res = await getChainFeeRate(args);

      equal(res.tokens_per_vbyte, expected.tokens_per_vbyte, 'Got fee rate');
    }

    return end();
  });
});
