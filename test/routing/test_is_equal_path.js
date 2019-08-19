const {test} = require('tap');

const isEqualPath = require('./../../routing/is_equal_path');

const tests = [
  {
    args: {paths: [[{}], []]},
    description: 'Paths must be of equal length',
    expected: false,
  },
  {
    args: {paths: [[{channel: 'foo'}], [{channel: 'bar'}]]},
    description: 'Channels must be equal',
    expected: false,
  },
  {
    args: {
      paths: [
        [{channel: 'foo', public_key: 'bar'}],
        [{channel: 'foo', public_key: 'baz'}],
      ],
    },
    description: 'Public keys must be equal',
    expected: false,
  },
  {
    args: {
      paths: [
        [{channel: 'foo', public_key: 'bar'}],
        [{channel: 'foo', public_key: 'bar'}],
      ],
    },
    description: 'Equal keys and channels mean paths are equal',
    expected: true,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    equal(isEqualPath(args), expected, 'Path equality as expected');

    return end();
  });
});
