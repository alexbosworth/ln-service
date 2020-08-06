const {test} = require('tap');

const routing = './../../routing';

const ignoreAsIgnoredPairs = require(`${routing}/ignore_as_ignored_pairs`);

const tests = [
  {
    args: {},
    description: 'When there are no ignores, nothing is returned',
    expected: {},
  },
  {
    args: {ignore: 'ignore'},
    description: 'Ignore is expected to be an array',
    error: 'ExpectedArrayOfPairsToIgnore',
  },
  {
    args: {ignore: [{from_public_key: 'from_public_key'}]},
    description: 'A pair has a to public key',
    expected: {ignored: []},
  },
  {
    args: {ignore: [{to_public_key: 'to_public_key'}]},
    description: 'A pair has a from public key',
    expected: {ignored: []},
  },
  {
    args: {ignore: [{from_public_key: '00', to_public_key: '01'}]},
    description: 'A pair is mapped',
    expected: {ignored: [{from: '00', to: '01'}]},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepEqual, end, equal, throws}) => {
    if (!!error) {
      throws(() => ignoreAsIgnoredPairs(args), new Error(error), 'Got error');
    } else if (!!expected.ignored) {
      const {ignored} = ignoreAsIgnoredPairs(args);

      const got = ignored.map(n => {
        return {from: n.from.toString('hex'), to: n.to.toString('hex')};
      });

      deepEqual(got, expected.ignored, 'Got expected ignore pairs');
    } else {
      equal(ignoreAsIgnoredPairs(args).ignored, undefined, 'Nothing ignored');
    }

    return end();
  });
});
