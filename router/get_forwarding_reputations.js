const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {chanFormat} = require('bolt07');
const {returnResult} = require('asyncjs-util');

const {getChannel} = require('./../lightning');

const {isArray} = Array;
const timeAsDate = n => new Date(parseInt(n, 10) * 1e3).toISOString();

/** Get the set of forwarding reputations

  Requires `offchain:read` permission

  {
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    nodes: [{
      peers: [{
        [failed_tokens]: <Failed to Forward Tokens Number>
        [forwarded_tokens]: <Forwarded Tokens Number>
        [last_failed_forward_at]: <Failed Forward At ISO-8601 Date String>
        [last_forward_at]: <Forwarded At ISO 8601 Date String>
        to_public_key: <To Public Key Hex String>
      }]
      public_key: <Node Identity Public Key Hex String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd) {
          return cbk([400, 'ExpectedLndToGetForwardingReputations']);
        }

        return cbk();
      },

      // Get forwarding reputations
      getReputations: ['validate', ({}, cbk) => {
        return lnd.router.queryMissionControl({}, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingReputations', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseToGetForwardReputationsQuery']);
          }

          return cbk(null, {nodes: res.nodes || [], pairs: res.pairs});
        });
      }],

      // Peers
      peers: ['getReputations', ({getReputations}, cbk) => {
        const {pairs} = getReputations;

        if (!!pairs.find(n => !Buffer.isBuffer(n.node_from))) {
          return cbk([503, 'ExpectedFromNodePublicKeyInReputationsResponse']);
        }

        if (!!pairs.find(n => !Buffer.isBuffer(n.node_to))) {
          return cbk([503, 'ExpectedToNodePublicKeyInReputationsResponse'])
        }

        return cbk(null, pairs.map(pair => {
          const forwardAmount = pair.history.success_amt_sat;
          const lastFailAt = Number(pair.history.fail_time) || undefined;
          const successAt = Number(pair.history.success_time) || undefined;

          const isFail = !!lastFailAt;
          const isSuccess = !!successAt;

          return {
            failed_tokens: !!isFail ? Number(pair.history.fail_amt_sat) : null,
            forwarded_tokens: !!isSuccess ? Number(forwardAmount) : null,
            last_failed_forward_at: !isFail ? null : timeAsDate(lastFailAt),
            last_forward_at: !!isSuccess ? timeAsDate(successAt) : null,
            public_key: pair.node_from.toString('hex'),
            to_public_key: pair.node_to.toString('hex'),
          };
        }));
      }],

      // Final set of reputations
      reputations: ['peers', ({peers}, cbk) => {
        const nodes = [];

        peers.filter(pair => {
          if (!!nodes.find(n => n.public_key === pair.public_key)) {
            return;
          }

          return nodes.push({public_key: pair.public_key});
        });

        const nodesWithPeers = nodes.map(node => {
          const publicKey = node.public_key;

          return {
            peers: peers.filter(n => n.public_key === publicKey).map(n => ({
              failed_tokens: n.failed_tokens || undefined,
              forwarded_tokens: n.forwarded_tokens || undefined,
              last_failed_forward_at: n.last_failed_forward_at || undefined,
              last_forward_at: n.last_forward_at || undefined,
              to_public_key: n.to_public_key,
            })),
            public_key: publicKey,
          };
        });

        return cbk(null, {nodes: nodesWithPeers});
      }],
    },
    returnResult({reject, resolve, of: 'reputations'}, cbk));
  });
};
