const asyncAuto = require('async/auto');

const {externalType} = require('./constants');
const getAutopilot = require('./get_autopilot');
const {maxScore} = require('./constants');
const {returnResult} = require('./../async-util');
const {unknownHeuristicErrorMessage} = require('./constants');
const {wrongLnd} = require('./constants');

const {floor} = Math;
const {isArray} = Array;

/** Configure Autopilot settings

  // Either candidate_nodes or is_enabled is required
  // Candidate node scores range from 1 to 100,000,000

  {
    [candidate_nodes]: [{
      public_key: <Node Public Key Hex String>
      score: <Score Number>
    }]
    [is_enabled]: <Enable Autopilot Bool>
    lnd: <Authenticated LND gRPC Object>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!isArray(args.candidate_nodes) && args.is_enabled === undefined) {
        return cbk([400, 'ExpectedNodesOrEnabledSettingToAdjustAutopilot']);
      }

      if (!args.lnd || !args.lnd.autopilot || !args.lnd.autopilot.status) {
        return cbk([400, 'ExpectedAutopilotEnabledLndToSetAutopilot']);
      }

      const nodes = args.candidate_nodes || [];

      if (!!nodes.find(n => !n.public_key)) {
        return cbk([400, 'ExpectedAllCandidateNodesToHavePublicKeys']);
      }

      if (!!nodes.find(({score}) => !floor(score))) {
        return cbk([400, 'ExpectedAllCandidateNodesToHaveScore']);
      }

      if (!!nodes.find(({score}) => score > maxScore)) {
        return cbk([400, 'ExpectedCandidateNodesToHaveValidScores']);
      }

      return cbk();
    },

    // Get existing status
    getStatus: ['validate', ({}, cbk) => getAutopilot({lnd: args.lnd}, cbk)],

    // Adjust candidate nodes
    setNodes: ['validate', ({}, cbk) => {
      // Exit early when there are no adjustments to candidate nodes
      if (!args.candidate_nodes || !args.candidate_nodes.length) {
        return cbk();
      }

      const heuristic = externalType;
      const scores = {};

      const nodes = args.candidate_nodes.map(node => ({
        public_key: node.public_key,
        score: node.score / maxScore,
      }));

      nodes.forEach(n => scores[n.public_key] = n.score);

      return args.lnd.autopilot.setScores({heuristic, scores}, (err, res) => {
        if (!!err && err.message === unknownHeuristicErrorMessage) {
          return cbk([400, 'ExternalScoreHeuristicNotEnabled']);
        }

        if (!!err) {
          return cbk([503, 'FailedToSetAutopilotCandidateNodeScores', err]);
        }

        return cbk();
      });
    }],

    // Modify the autopilot status
    setStatus: ['getStatus', 'setNodes', ({getStatus}, cbk) => {
      const enable = args.is_enabled;

      // Exit early when autopilot status does not need to be set
      if (enable === undefined || getStatus.is_enabled === enable) {
        return cbk();
      }

      return args.lnd.autopilot.modifyStatus({enable}, err => {
        if (!!err && err.message === wrongLnd) {
          return cbk([400, 'ExpectedAutopilotEnabledLndToSetAutopilotStatus']);
        }

        if (!!err) {
          return cbk([503, 'UnexpectedErrorSettingAutopilotStatus', err]);
        }

        return cbk();
      });
    }],
  },
  returnResult({}, cbk));
};
