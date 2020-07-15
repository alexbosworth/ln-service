const {test} = require('@alexbosworth/tap');

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
  {
    args: {},
    description: 'No ignored directives means empty result',
    expected: {},
  },
  {
    args: {ignore: 'foo'},
    description: 'Ignore must be an array',
    error: 'ExpectedArrayOfEdgesToIgnore',
  }
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepEqual, end, equal, throws}) => {
    if (!!error) {
      throws(() => ignoreAsIgnoredEdges(args), new Error(error), 'Got error');
    } else if (!!expected.ignored) {
      const {ignored} = ignoreAsIgnoredEdges(args);

      deepEqual(expected.ignored, ignored, 'Edges mapped to ignores');
    } else {
      equal(ignoreAsIgnoredEdges(args).ignored, undefined, 'Got no ignore');
    }

    return end();
  });
});
