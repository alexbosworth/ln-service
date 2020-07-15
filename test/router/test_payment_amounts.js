const {test} = require('@alexbosworth/tap');

const paymentAmounts = require('./../../router/payment_amounts');

const tests = [
  {
    args: {},
    description: 'An amount to send is required',
    error: 'ExpectedAmountFromRequestOrMillitokensOrTokens',
  },
  {
    args: {max_fee: 1, max_fee_mtokens: '2', tokens: 1},
    description: 'Max fee mtokens cannot contradict max fee',
    error: 'UnexpectedDifferingMaxFeeAndMaxFeeMtokens',
  },
  {
    args: {mtokens: '2', tokens: 1},
    description: 'Mtokens cannot contradict tokens',
    error: 'UnexpectedDifferingMtokensAndTokens',
  },
  {
    args: {max_fee: 1, max_fee_mtokens: '1000', tokens: 1},
    description: 'Max fee mtokens can be the same as max fee',
    expected: {max_fee: 1, tokens: 1},
  },
  {
    args: {max_fee: 1, tokens: 1},
    description: 'Can just set max fee by itself',
    expected: {max_fee: 1, tokens: 1},
  },
  {
    args: {max_fee_mtokens: '2', tokens: 1},
    description: 'Can just set max fee mtokens by itself',
    expected: {max_fee_mtokens: '2', tokens: 1},
  },
  {
    args: {tokens: 1},
    description: 'Not specifying a max fee results in unlimited fee',
    expected: {max_fee: Number.MAX_SAFE_INTEGER, tokens: 1},
  },
  {
    args: {mtokens: '1000', tokens: 1},
    description: 'Setting mtokens and tokens results in set tokens',
    expected: {max_fee: Number.MAX_SAFE_INTEGER, tokens: 1},
  },
  {
    args: {mtokens: '1000'},
    description: 'Mtokens can be set by itself',
    expected: {max_fee: Number.MAX_SAFE_INTEGER, mtokens: '1000'},
  },
  {
    args: {request: 'request'},
    description: 'A request can be set instead of tokens',
    expected: {max_fee: Number.MAX_SAFE_INTEGER},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({equal, end, throws}) => {
    if (!!error) {
      throws(() => paymentAmounts(args), new Error(error), 'Got expected err');
    } else {
      const amounts = paymentAmounts(args);

      equal(amounts.max_fee, expected.max_fee, 'Got correct max fee');
      equal(amounts.max_fee_mtokens, expected.max_fee_mtokens, 'Got fee mtok');
      equal(amounts.mtokens, expected.mtokens, 'Got correct mtokens');
      equal(amounts.tokens, expected.tokens, 'Got correct tokens');
    }

    return end();
  });
});
