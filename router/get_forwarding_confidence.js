const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const {ceil} = Math;
const confidenceDenominator = 1e6;
const msPerSec = 1e3;
const unimplementedError = 'unknown service routerrpc.Router';

/** Get the confidence in being able to send between a direct pair of nodes

  Requires `offchain:read` permission

  {
    from: <From Public Key Hex String>
    lnd: <Authenticated LND API Object>
    mtokens: <Millitokens To Send String>
    to: <To Public Key Hex String>
  }

  @returns via cbk or Promise
  {
    confidence: <Success Confidence Score Out Of One Million Number>
  }
*/
module.exports = ({from, lnd, mtokens, to}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!from) {
          return cbk([400, 'ExpectedFromPublicKeyToGetRoutingConfidence']);
        }

        if (!isLnd({lnd, method: 'queryProbability', type: 'router'})) {
          return cbk([400, 'ExpectedAuthenticatedLndToGetRoutingConfidence']);
        }

        if (!mtokens) {
          return cbk([400, 'ExpectedMillitokensToGetRoutingConfidence']);
        }

        if (!to) {
          return cbk([400, 'ExpectedToPublicKeyToGetRoutingConfidence']);
        }

        return cbk();
      },

      // Get probability of success
      getConfidence: ['validate', ({}, cbk) => {
        return lnd.router.queryProbability({
          amt_msat: mtokens,
          from_node: Buffer.from(from, 'hex'),
          to_node: Buffer.from(to, 'hex'),
        },
        (err, res) => {
          if (!!err && err.details === unimplementedError) {
            return cbk([501, 'QueryProbabilityNotImplemented']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorFromQueryProbability', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseFromQueryProbability']);
          }

          if (!res.history) {
            return cbk([503, 'ExpectedHistoryFromQueryProbability']);
          }

          if (res.probability === undefined) {
            return cbk([503, 'ExpectedProbabilityInQueryProbabilityResult']);
          }

          return cbk(null, {
            confidence: ceil(res.probability * confidenceDenominator),
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getConfidence'}, cbk));
  });
};
