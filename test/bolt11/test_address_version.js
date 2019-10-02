const {test} = require('tap');

const addressVersion = require('./../../bolt11/address_version');

const tests = [
  {
    args: {},
    description: 'Address version with nothing returns error',
    error: 'ExpectedNetworkToDeriveAddressVersion',
  },
  {
    args: {network: 'network'},
    description: 'Unknown network',
    error: 'UnexpectedNetworkToDeriveAddressVersion',
  },
  {
    args: {network: 'bitcoin'},
    description: 'Address version with no version returns error',
    error: 'ExpectedVersionToDeriveAddressVersion',
  },
  {
    args: {prefix: 'bbb', version: 1},
    description: 'Address version with prefix returns',
    expected: {version: 1},
  },
  {
    args: {network: 'bitcoin', version: 17},
    description: 'Address version pkhash returns',
    error: 'UnexpectedVersionToDeriveBoltOnChainAddressVersion',
  },
  {
    args: {network: 'bitcoin', version: 0},
    description: 'Address version pkhash returns',
    expected: {version: 17},
  },
  {
    args: {network: 'bitcoin', version: 5},
    description: 'Address version p2sh returns',
    expected: {version: 18},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({end, equal, throws}) => {
    if (!!error) {
      throws(() => addressVersion(args), new Error(error), 'Got expected err');
    } else {
      equal(addressVersion(args).version, expected.version, 'Got version');
    }

    return end();
  });
});
