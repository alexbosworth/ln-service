const {test} = require('tap');

const mtokensAsHrp = require('./../../bolt11/mtokens_as_hrp');

const tests = [
  {
    args: {mtokens: '1000'}, description: 'Test nano tokens', expected: '10n',
  },
  {
    args: {mtokens: '10000'}, description: 'Test more nano', expected: '100n',
  },
  {
    args: {mtokens: '100000'}, description: 'Test micro', expected: '1u',
  },
  {
    args: {mtokens: '1', description: 'Test pico', expected: '10p'},
  },
  {
    args: {mtokens: '100000000'}, description: 'Test milli', expected: '1m',
  },
  {
    args: {mtokens: '100000000000'}, description: 'Test btc', expected: '1',
  },
  {
    args: {mtokens: '123456789000'},
    description: 'Test extended nano',
    expected: '1234567890n',
  },
  {
    args: {mtokens: '123450000000'},
    description: 'Test extended micro',
    expected: '1234500u',
  },
  {
    args: {mtokens: '123400000000'},
    description: 'Test extended milli',
    expected: '1234m',
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    const {hrp} = mtokensAsHrp(args);

    equal(hrp, expected, 'Hrp derived from mtokens');

    return end();
  });
});
