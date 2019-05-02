const {test} = require('tap');

const {ignoreAsIgnoredEdges} = require('./../../routing');

const tests = [
  // Ignored edges are returned
  {
    args: {
      ignore: [{channel: '1x2x3', from_public_key: 'a', to_public_key: 'b'}],
    },
    description: 'Channel id and reverse is mapped',
    expected: {
      ignored: [{channel_id: '1099511758851', direction_reverse: false}],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepEqual, end}) => {
    const {ignored} = ignoreAsIgnoredEdges(args);

    deepEqual(expected.ignored, ignored, 'Edges mapped to ignores');

    return end();
  });
});
