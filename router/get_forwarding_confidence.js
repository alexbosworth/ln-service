const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const {ceil} = Math;
const confidenceDenominator = 1e6;
const msPerSec = 1e3;
const unimplementedError = 'unknown service routerrpc.Router';

/** Get the confidence in being able to send between a direct pair of nodes

  Requires LND built with `routerrpc` build tag

  Note: this method is not supported in LND 0.8.1 and below.

  {
    from: <From Public Key Hex String>
    lnd: <Authenticated LND gRPC API Object>
    mtokens: <Millitokens To Send String>
    to: <To Public Key Hex String>
  }

  @returns via cbk or Promise
  {
    confidence: <Success Confidence Score Out Of One Million Number>
    [past_failure_at]: <Past Failure At ISO 8601 Date String>
    [past_failure_tokens]: <Smallest Tokens That Historically Failed Number>
    [past_success_at]: <Past Success At ISO 8601 Date String>
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

          if (res.history.last_attempt_successful === undefined) {
            return cbk([503, 'ExpectedLastSuccessfulAttemptForProbability']);
          }

          if (!res.history.min_penalize_amt_sat) {
            return cbk([503, 'ExpectedMinPenaltyAmountInQueryProbability']);
          }

          if (!res.history.timestamp) {
            return cbk([503, 'ExpectedTimestampForProbabilityHistory']);
          }

          if (res.probability === undefined) {
            return cbk([503, 'ExpectedProbabilityInQueryProbabilityResult']);
          }

          const timestamp = Number(res.history.timestamp);

          const date = new Date(timestamp * msPerSec).toISOString();

          // On versions of LND 0.8.1 and below, no success time is returned
          const isSuccess = res.history.last_attempt_successful;

          // Exit early when the past attempt was successful, no success date
          if (isSuccess && res.history.success_time === '0') {
            return cbk(null, {
              confidence: ceil(res.probability * confidenceDenominator),
              past_success_at: date,
            });
          }

          // Exit early when the past attempt was successful
          if (res.history.success_time !== '0') {
            const successEpochTime = Number(res.history.success_time);

            const successAt = new Date(successEpochTime * msPerSec);

            return cbk(null, {
              confidence: ceil(res.probability * confidenceDenominator),
              past_success_at: successAt.toISOString(),
            });
          }

          const pastFailureTokens = res.history.min_penalize_amt_sat;

          return cbk(null, {
            confidence: ceil(res.probability * confidenceDenominator),
            past_failure_at: date,
            past_failure_tokens: Number(pastFailureTokens) || undefined,
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getConfidence'}, cbk));
  });
};
