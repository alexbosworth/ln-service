const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const getForwardingReputations = require('./get_forwarding_reputations');

const decBase = 10;
const defaultOdds = 950000;
const {isArray} = Array;
const oddsDenominator = BigInt(1e6);

/** Get routing odds of successfully routing a payment to a destination

  Requires lnd built with routerrpc build tag

  {
    hops: [{
      channel: <Standard Format Channel Id String>
      forward_mtokens: <Forward Millitokens String>
      public_key: <Forward Edge Public Key Hex String>
    }]
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    success_odds: <Odds of Success Out Of 1 Million Number>
  }
*/
module.exports = ({hops, lnd}, cbk) => {
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

      // Forwarding edges
      forwarding: ['validate', ({}, cbk) => {
        const forwarding = hops.slice().map((hop, i) => {
          return {
            channel: hop.channel,
            forward_mtokens: hop.forward_mtokens,
            from_public_key: !i ? undefined : hops[i - 1].public_key,
          };
        });

        return cbk(null, forwarding.filter(n => !!n.from_public_key));
      }],

      // Get reputations
      getReputations: ['validate', ({}, cbk) => {
        return getForwardingReputations({lnd}, cbk);
      }],

      // Relevant channels
      odds: [
        'forwarding',
        'getReputations',
        ({forwarding, getReputations}, cbk) =>
      {
        const odds = forwarding.map(forward => {
          const forwardMtokens = BigInt(forward.forward_mtokens);

          const forwardingNode = getReputations.nodes
            .find(node => node.public_key === forward.from_public_key);

          // Exit early with default odds when node has no reputation at all
          if (!forwardingNode) {
            return defaultOdds;
          }

          const forwardingChannel = forwardingNode.channels
            .find(channel => channel.id === forward.channel);

          // Exit early with general node odds when no chan reputation exists
          if (!forwardingChannel) {
            return forwardingNode.general_success_odds;
          }

          // Exit early with default odds when reputation is not relevant
          if (forwardMtokens < BigInt(forwardingChannel.min_relevant_tokens)) {
            return forwardingNode.general_success_odds;
          }

          return forwardingChannel.success_odds;
        });

        const totalDenominator = odds.slice(1)
          .reduce((sum, n) => sum * oddsDenominator, 1n);

        const totalOdds = odds.reduce((sum, n) => sum * BigInt(n), 1n);

        const successOdds = (totalOdds / totalDenominator).toString();

        return cbk(null, {success_odds: parseInt(successOdds, decBase)});
      }],
    },
    returnResult({reject, resolve, of: 'odds'}, cbk));
  });
};
