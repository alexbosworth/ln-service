const {test} = require('@alexbosworth/tap');

const {safeTokens} = require('./../../bolt00');

const tests = [
  {
    args: {mtokens: '1000'},
    description: 'When millitokens is not a fractional token, tokens returned',
    expected: {safe: 1, tokens: 1},
  },
  {
    args: {mtokens: '1001'},
    description: 'Safe tokens are rounded up, regular tokens rounded down',
    expected: {safe: 2, tokens: 1},
  },
  {
    args: {mtokens: '1999'},
    description: 'Any value of fractional token is rounded up',
    expected: {safe: 2, tokens: 1},
  },
  {
    args: {mtokens: '830497000'},
    description: 'A larger amount of mtokens is converted',
    expected: {safe: 830497, tokens: 830497},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({equal, end}) => {
    const {safe, tokens} = safeTokens(args);

    equal(safe, expected.safe, 'Got expected safe tokens');
    equal(tokens, expected.tokens, 'Got expected tokens');

    return end();
  });
});
