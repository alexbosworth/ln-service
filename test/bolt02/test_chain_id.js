const {test} = require('tap');

const {chainId} = require('./../../bolt02');

const tests = [
  {
    args: {chain: 'bitcoin', network: 'mainnet'},
    description: 'Chain id returned',
    expected: '6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000',
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    const {chain} = chainId(args);

    equal(chain, expected, 'Chain id derived from chain and network');

    return end();
  });
});
