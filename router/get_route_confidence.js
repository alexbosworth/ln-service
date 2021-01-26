const asyncAuto = require('async/auto');
const asyncReduce = require('async/reduce');
const {returnResult} = require('asyncjs-util');

const {getForwardingConfidence} = require('lightning/lnd_methods');
const {getForwardingReputations} = require('lightning/lnd_methods');
const {getIdentity} = require('lightning/lnd_methods');

const combine = (a, b) => Math.round(a / 1e6 * b / 1e6);
const decBase = 10;
const defaultOdds = 950000;
const fullConfidence = 1e6;
const {isArray} = Array;
const oddsDenominator = BigInt(1e6);
const unimplemented = 'QueryProbabilityNotImplemented';

/** Get confidence of successfully routing a payment to a destination

  Requires `offchain:read` permission

  If `from` is not set, self is default

  {
    [from]: <Starting Hex Serialized Public Key>
    hops: [{
      forward_mtokens: <Forward Millitokens String>
      public_key: <Forward Edge Public Key Hex String>
    }]
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    confidence: <Confidence Score Out Of One Million Number>
  }
*/
module.exports = ({from, hops, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isArray(hops)) {
          return cbk([400, 'ExpectedArrayOfHopsToCalculateRoutingOdds']);
        }

        if (!!hops.find(n => !n.channel || !n.public_key)) {
          return cbk([400, 'ExpectedHopsWithEdges']);
        }

        return cbk();
      },

      // Get reputations
      getReputations: ['validate', ({}, cbk) => {
        return getForwardingReputations({lnd}, cbk);
      }],

      // Source key
      source: ['validate', ({}, cbk) => {
        if (!!from) {
          return cbk(null, {public_key: from});
        }

        return getIdentity({lnd}, cbk);
      }],

      // Forwarding edges
      forwarding: ['source', ({source}, cbk) => {
        const forwarding = hops.slice().map((hop, i) => {
          return {
            channel: hop.channel,
            forward_mtokens: hop.forward_mtokens,
            from_public_key: !i ? source.public_key : hops[i - 1].public_key,
            to_public_key: hops[i].public_key,
          };
        });

        return cbk(null, forwarding.filter(n => !!n.from_public_key));
      }],

      // Get all confidence scores
      getScores: ['source', ({source}, cbk) => {
        const pairs = hops.slice().map((hop, i) => {
          return {
            from: !i ? source.public_key : hops[i - 1].public_key,
            mtokens: hop.forward_mtokens,
            to: hops[i].public_key,
          };
        });

        return asyncReduce(pairs, fullConfidence, (confidence, pair, cbk) => {
          return getForwardingConfidence({
            lnd,
            from: pair.from,
            mtokens: pair.mtokens,
            to: pair.to,
          },
          (err, res) => {
            if (!!err) {
              return cbk(err);
            }

            return cbk(null, combine(res.confidence, confidence));
          });
        },
        (err, confidence) => {
          if (!!err) {
            const [, message] = err;

            return message === unimplemented ? cbk() : cbk(err);
          }

          return cbk(null, {confidence});
        });
      }],

      // Relevant channels
      odds: [
        'forwarding',
        'getReputations',
        'getScores',
        ({forwarding, getReputations, getScores}, cbk) =>
      {
        const odds = forwarding.map(forward => {
          const forwardMtokens = BigInt(forward.forward_mtokens);

          const forwardingNode = getReputations.nodes
            .find(node => node.public_key === forward.from_public_key);

          // Exit early with default odds when node has no reputation at all
          if (!forwardingNode) {
            return defaultOdds;
          }

          const forwardingPeer = forwardingNode.peers
            .find(peer => peer.to_public_key === forward.to_public_key);

          const forwarding = forwardingPeer;

          // Exit early with general node odds when no chan reputation exists
          if (!forwarding) {
            return forwardingNode.confidence || defaultOdds;
          }

          // Exit early with default odds when reputation is not relevant
          if (forwardMtokens < BigInt(forwarding.min_relevant_tokens || '0')) {
            return forwardingNode.confidence;
          }

          return forwarding.confidence;
        });

        const totalDenominator = odds.slice(1)
          .reduce((sum, n) => sum * oddsDenominator, BigInt('1'));

        const totalOdds = odds
          .reduce((sum, n) => sum * BigInt(n || '0'), BigInt('1'));

        const successOdds = (totalOdds / totalDenominator).toString();

        return cbk(null, {confidence: parseInt(successOdds, decBase)});
      }],
    },
    returnResult({reject, resolve, of: 'odds'}, cbk));
  });
};
