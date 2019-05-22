const {test} = require('tap');

const {getAutopilot} = require('./../../');

const tests = [
  {
    args: {lnd: {}},
    description: 'Get autopilot with the wrong lnd',
    expected: {
      error_code: 400,
      error_message: 'ExpectedAutopilotEnabledLndToGetAutopilotStatus',
    },
  },
  {
    args: {
      lnd: {
        autopilot: {
          queryScores: ({}, cbk) => cbk(),
          status: ({}, cbk) => cbk(null, {active: false}),
        },
      },
    },
    description: 'Lookup enabled status',
    expected: {is_enabled: false},
  },
  {
    args: {
      lnd: {
        autopilot: {
          queryScores: ({}, cbk) => {
            return cbk(null, {
              results: [
                {heuristic: 'externalscore', scores: {foo: 0.5}},
                {heuristic: 'preferential', scores: {foo: 1}},
                {heuristic: 'weightedcomb', scores: {foo: 0.75}},
              ],
            });
          },
          status: ({}, cbk) => cbk(null, {active: true}),
        },
      },
      node_scores: ['foo'],
    },
    description: 'Lookup node scores',
    expected: {
      is_enabled: true,
      node: {
        local_preferential_score: 100000000,
        local_score: 50000000,
        preferential_score: 100000000,
        public_key: 'foo',
        score: 50000000,
        weighted_local_score: 75000000,
        weighted_score: 75000000,
      },
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    return getAutopilot(args, (err, res) => {
      const [errCode, errMessage] = err || [];

      if (!!expected.error_code || !!errCode) {
        equal(errCode, expected.error_code, 'Got expected error code');
      }

      if (!!expected.error_message || !!errMessage) {
        equal(errMessage, expected.error_message, 'Got expected err message');
      }

      if (!!err) {
        return end();
      }

      equal(res.is_enabled, expected.is_enabled, 'Got is_enabled as expected');

      if (!!expected.node) {
        const [node] = res.nodes || [];

        equal(
          node.local_preferential_score,
          expected.node.local_preferential_score,
          'Local preferential score'
        );

        equal(
          node.local_score,
          expected.node.local_score,
          'Local external score'
        );

        equal(
          node.preferential_score,
          expected.node.preferential_score,
          'Preferential score'
        );

        equal(node.public_key, expected.node.public_key, 'Node public key');
        equal(node.score, expected.node.score, 'Node external score');

        equal(
          node.weighted_local_score,
          expected.node.weighted_local_score,
          'Weighted score, local representation'
        );

        equal(
          node.weighted_score,
          expected.node.weighted_score,
          'Weighted score'
        );
      }

      return end();
    });
  });
});
