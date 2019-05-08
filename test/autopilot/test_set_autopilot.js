const {test} = require('tap');

const {setAutopilot} = require('./../../');

const tests = [
  {
    args: {is_enabled: true, lnd: {}},
    description: 'Set autopilot with the wrong lnd',
    expected: {
      error_code: 400,
      error_message: 'ExpectedAutopilotEnabledLndToSetAutopilot',
    },
  },
  {
    args: {
      candidate_nodes: [{
        public_key: Buffer.alloc(33).toString('hex'),
        score: 50000000,
      }],
      is_enabled: true,
      lnd: {
        modifyStatus: ({}, cbk) => cbk(),
        queryScores: ({}, cbk) => cbk(),
        setScores: ({heuristic, scores}, cbk) => {
          if (scores[Buffer.alloc(33).toString('hex')] !== 0.5) {
            return cbk([500, 'ExpectedExternalScorePassed']);
          }

          if (heuristic !== 'externalscore') {
            return cbk([500, 'ExpectedExternalScoreHeuristicSpecified']);
          }

          return cbk();
        },
        status: ({}, cbk) => cbk(null, {active: false}),
      },
    },
    description: 'Set enabled status',
    expected: {},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    return setAutopilot(args, (err, res) => {
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

      return end();
    });
  });
});
