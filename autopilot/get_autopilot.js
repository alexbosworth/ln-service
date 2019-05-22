const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {flattenDeep} = require('lodash');

const {externalType} = require('./constants');
const {maxScore} = require('./constants');
const {prefAttachType} = require('./constants');
const {returnResult} = require('./../async-util');
const {weightedType} = require('./constants');
const {wrongLnd} = require('./constants');

const {isArray} = Array;
const {keys} = Object;

/** Get Autopilot status

  // Optionally, get the score of nodes as considered by the autopilot.
  // Local scores reflect an internal scoring that includes local channel info

  {
    lnd: <Authenticated LND gRPC Object>
    [node_scores]: [<Get Score For Public Key Hex String>]
  }

  @returns via cbk
  {
    is_enabled: <Autopilot is Enabled Bool>
    nodes: [{
      local_preferential_score: <Local-adjusted Pref Attachment Score Number>
      local_score: <Local-adjusted Externally Set Score Number>
      preferential_score: <Preferential Attachment Score Number>
      public_key: <Node Public Key Hex String>
      score: <Externally Set Score Number>
      weighted_local_score: <Combined Weighted Locally-Adjusted Score Number>
      weighted_score: <Combined Weighted Score Number>
    }]
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.lnd || !args.lnd.autopilot || !args.lnd.autopilot.status) {
        return cbk([400, 'ExpectedAutopilotEnabledLndToGetAutopilotStatus']);
      }

      return cbk();
    },

    // Get node scores
    getNodeScores: ['validate', ({}, cbk) => {
      return asyncMap([false, true], (isLocal, cbk) => {
        if (!args.node_scores) {
          return cbk();
        }

        return args.lnd.autopilot.queryScores({
          ignore_local_state: !isLocal,
          pubkeys: args.node_scores,
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingNodeScores', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResultForLocalNodeScoresQuery']);
          }

          if (!isArray(res.results)) {
            return cbk([503, 'ExpectedArrayOfResultsForNodesScoresQuery']);
          }

          if (!!res.results.find(n => !n)) {
            return cbk([503, 'UnexpectedHeuristicResultSetInNodeScores']);
          }

          return cbk(null, {is_local: isLocal, results: res.results});
        });
      },
      cbk);
    }],

    // Get status
    getStatus: ['validate', ({}, cbk) => {
      return args.lnd.autopilot.status({}, (err, res) => {
        if (!!err && err.message === wrongLnd) {
          return cbk([400, 'ExpectedLndBuiltWithAutopilotToGetStatus']);
        }

        if (!!err) {
          return cbk([503, 'UnexpectedErrorGettingAutopilotStatus', err]);
        }

        if (!res) {
          return cbk([503, 'UnexpectedEmptyResultGettingAutopilotStatus']);
        }

        if (res.active !== false && res.active !== true) {
          return cbk([503, 'UnexpectedResponseForAutopilotStatusQuery']);
        }

        return cbk(null, {is_enabled: res.active});
      });
    }],

    // Node scores
    nodes: ['getNodeScores', ({getNodeScores}, cbk) => {
      return asyncMap(getNodeScores, (gotResult, cbk) => {
        if (!gotResult) {
          return cbk(null, []);
        }

        return asyncMap(gotResult.results, ({heuristic, scores}, cbk) => {
          if (!heuristic) {
            return cbk([503, 'ExpectedHeuristicLabelForNodeScoreSet']);
          }

          if (!scores) {
            return cbk([503, 'ExpectedScoresForNodesInScoreResults']);
          }

          return cbk(null, keys(scores).map(publicKey => ({
            heuristic,
            is_local: gotResult.is_local,
            public_key: publicKey,
            score: maxScore * (scores[publicKey] || 0),
          })));
        },
        cbk);
      },
      (err, nodes) => {
        if (!!err) {
          return cbk(err);
        }

        if (!args.node_scores) {
          return cbk();
        }

        const allNodes = flattenDeep(nodes);

        if (!allNodes.length) {
          return undefined;
        }

        const publicKeys = {};

        allNodes.forEach(node => publicKeys[node.public_key] = {});

        const nodesWithScores = keys(publicKeys).map(publicKey => {
          const scores = allNodes.filter(n => n.public_key === publicKey);

          const score = scores.filter(n => n.heuristic === externalType);
          const pref = scores.filter(n => n.heuristic === prefAttachType);
          const weighted = scores.filter(n => n.heuristic === weightedType);

          const localScore = score.find(n => n.is_local) || {};
          const localWeighted = weighted.find(n => n.is_local) || {};
          const localPreferential = pref.find(n => n.is_local) || {};
          const globalScore = score.find(n => !n.is_local) || {};
          const globalPreferential = pref.find(n => !n.is_local) || {};
          const globalWeighted = weighted.find(n => !n.is_local) || {};

          return {
            local_preferential_score: localPreferential.score,
            local_score: localScore.score,
            preferential_score: globalPreferential.score,
            public_key: publicKey,
            score: globalScore.score,
            weighted_local_score: localWeighted.score,
            weighted_score: globalWeighted.score,
          };
        });

        return cbk(null, nodesWithScores);
      });
    }],

    // Summary
    autopilot: ['getStatus', 'nodes', ({getStatus, nodes}, cbk) => {
      return cbk(null, {is_enabled: getStatus.is_enabled, nodes});
    }],
  },
  returnResult({of: 'autopilot'}, cbk));
};
