const {test} = require('tap');

const {ignoreAsIgnoredNodes} = require('./../../routing');

const tests = [
  {
    args: {
      ignore: [
        {from_public_key: '00'},
        {channel: '1x2x3', from_public_key: '01'},
      ],
    },
    description: 'From ignore node is returned',
    expected: {ignore: '00'},
  },
  {
    args: {
      ignore: [
        {channel: '1x2x3', to_public_key: '01'},
        {to_public_key: '00'},
      ],
    },
    description: 'To ignored node is returned',
    expected: {ignore: '00'},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepEqual, end}) => {
    const {ignored} = ignoreAsIgnoredNodes(args);

    const [ignore] = ignored;

    deepEqual(ignore.toString('hex'), expected.ignore, 'Node ignore mapped');

    return end();
  });
});
