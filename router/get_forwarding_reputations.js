const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {chanFormat} = require('bolt07');
const {returnResult} = require('asyncjs-util');

const {getChannel} = require('./../lightning');

const decBase = 10;
const {isArray} = Array;
const msPerSec = 1e3;
const oddsDenominator = 1e6;
const probabilityAsConfidence = n => round(parseFloat(n) * 1e6);
const {round} = Math;
const timeAsDate = n => new Date(parseInt(n, 10) * 1e3).toISOString();

/** Get the set of forwarding reputations

  Requires LND built with `routerrpc` build tag

  Note: In LND v0.7.1 channels reputations are returned.
  Note: In LND v0.8.0 peers reputations are returned.
  Note: after LND v0.8.0 confidence is not returned per peer.

  {
    [confidence]: <Ignore Confidence Higher than N out of 1 Million Number>
    lnd: <Authenticated LND gRPC API Object>
    [tokens]: <Reputation Against Forwarding Tokens Number>
  }

  @returns via cbk or Promise
  {
    nodes: [{
      channels: [{
        confidence: <Forwarding Confidence Out of 1 Million Number>
        id: <Standard Format Channel Id String>
        last_failed_forward_at: <Last Failed Forward Time ISO-8601 Date String>
        min_relevant_tokens: <Minimum Token Amount to Use This Estimate Number>
        [to_public_key]: <To Public Key Hex String>
      }]
      [confidence]: <Non-Channel-Specific Confidence Number>
      [last_failed_forward_at]: <Last Failed Forward Time ISO-8601 Date String>
      peers: [{
        [confidence]: <Forwarding Confidence Out of One Million Number>
        last_failed_forward_at: <Last Failed Forward Time ISO-8601 Date String>
        min_relevant_tokens: <Minimum Token Amount to Use This Estimate Number>
        to_public_key: <To Public Key Hex String>
      }]
      public_key: <Node Identity Public Key Hex String>
    }]
  }
*/
module.exports = ({confidence, lnd, tokens}, cbk) => {
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

          if (!isArray(res.nodes)) {
            return cbk([503, 'ExpectedArrayOfNodesInMissionControlResponse']);
          }

          return cbk(null, {nodes: res.nodes, pairs: res.pairs});
        });
      }],

      // Format and check reputations
      channels: ['getReputations', ({getReputations}, cbk) => {
        return asyncMapSeries(getReputations.nodes, (node, cbk) => {
          if (!node) {
            return cbk([503, 'ExpectedNodeInMissionControlResponse']);
          }

          if (!isArray(node.channels)) {
            return cbk([503, 'ExpectedChannelFailureInfoInNodeResponse']);
          }

          if (!node.last_fail_time) {
            return cbk([503, 'ExpectedLastFailTimeInReputationResponse']);
          }

          if (!node.other_success_prob) {
            return cbk([503, 'ExpectedChanSuccessProbForNode']);
          }

          if (!Buffer.isBuffer(node.pubkey)) {
            return cbk([503, 'ExpectedNodePublicKeyInResponse']);
          }

          const generalOdds = parseFloat(node.other_success_prob);
          const publicKey = node.pubkey.toString('hex');

          const lastFailedAt = parseInt(node.last_fail_time, decBase);

          const lastFailMs = !lastFailedAt ? null : lastFailedAt * msPerSec;

          const lastFailDate = !lastFailMs ? null : new Date(lastFailMs);

          const lastFail = !lastFailDate ? null : lastFailDate.toISOString();

          return asyncMapSeries(node.channels, (channel, cbk) => {
            if (!channel) {
              return cbk([503, 'ExpectedChannelInNodeChannelReputation']);
            }

            if (!channel.channel_id) {
              return cbk([503, 'ExpectedChannelIdInNodeChannelRepuation']);
            }

            try {
              chanFormat({number: channel.channel_id});
            } catch (err) {
              return cbk([503, 'UnexpectedChannelIdFormatInReputationChan']);
            }

            if (!channel.last_fail_time) {
              return cbk([503, 'ExpectedChannelLastFailTimeInReputationChan']);
            }

            if (!channel.min_penalize_amt_sat) {
              return cbk([503, 'ExpectedMinPenalizeAmtSatInChanReputation']);
            }

            if (!channel.success_prob) {
              return cbk([503, 'ExpectedChannelSuccessProbability']);
            }

            const channelId = chanFormat({number: channel.channel_id}).channel;
            const channelOdds = parseFloat(channel.success_prob);
            const fail = parseInt(channel.last_fail_time, decBase) * msPerSec;
            const minTokens = parseInt(channel.min_penalize_amt_sat, decBase);

            const successOdds = round(channelOdds * oddsDenominator);

            // Exit early when the channel history isn't relevant
            if (!!minTokens && !!tokens && tokens < minTokens) {
              return cbk();
            }

            // Exit early when the odds of this channel are too good
            if (!!confidence && successOdds > confidence) {
              return cbk();
            }

            return getChannel({lnd, id: channelId}, (err, res) => {
              const policies = !!err || !res ? [] : res.policies;

              const peer = policies.find(n => n.public_key !== publicKey);

              return cbk(null, {
                confidence: successOdds,
                id: channelId,
                last_failed_forward_at: new Date(fail).toISOString(),
                min_relevant_tokens: minTokens,
                to_public_key: (peer || {}).public_key,
              });
            });
          },
          (err, channels) => {
            if (!!err) {
              return cbk(err);
            }

            return cbk(null, {
              channels: channels.filter(n => !!n),
              confidence: round(generalOdds * oddsDenominator),
              last_failed_forward_at: lastFail || undefined,
              public_key: publicKey,
            });
          });
        },
        cbk);
      }],

      // Peers
      peers: ['getReputations', ({getReputations}, cbk) => {
        const {pairs} = getReputations;

        if (!!pairs.find(n => !n.last_fail_time)) {
          return cbk([503, 'ExpectedLastFailTimeInReputationsResponse']);
        }

        if (!!pairs.find(n => !n.min_penalize_amt_sat)) {
          return cbk([503, 'ExpectedMinPenalizeAmtSatInReputationResponse']);
        }

        if (!!pairs.find(n => !Buffer.isBuffer(n.node_from))) {
          return cbk([503, 'ExpectedFromNodePublicKeyInReputationsResponse']);
        }

        if (!!pairs.find(n => !Buffer.isBuffer(n.node_to))) {
          return cbk([503, 'ExpectedToNodePublicKeyInReputationsResponse'])
        }

        if (!!pairs.find(n => n.success_prob === undefined)) {
          return cbk([503, 'ExpectedSuccessProbInReputationResponse']);
        }

        return cbk(null, pairs.map(pair => {
          const confidence = probabilityAsConfidence(pair.success_prob);

          // Only after LND 0.8.0 there is history for pairs
          if (!pair.history || !Number(pair.history.timestamp)) {
            return {
              confidence: confidence || undefined,
              last_failed_forward_at: timeAsDate(pair.last_fail_time),
              min_relevant_tokens: Number(pair.min_penalize_amt_sat),
              public_key: pair.node_from.toString('hex'),
              to_public_key: pair.node_to.toString('hex'),
            };
          }

          const isFail = !pair.history.last_attempt_successful;

          const lastFailAt = !isFail ? null : Number(pair.history.timestamp);

          return {
            confidence: confidence || undefined,
            last_failed_forward_at: !isFail ? null : timeAsDate(lastFailAt),
            min_relevant_tokens: Number(pair.history.min_penalize_amt_sat),
            public_key: pair.node_from.toString('hex'),
            to_public_key: pair.node_to.toString('hex'),
          };
        }));
      }],

      // Final set of reputations
      reputations: ['channels', 'peers', ({channels, peers}, cbk) => {
        const nodes = channels.filter(n => !n.last_failed_forward_at);

        peers.filter(pair => {
          if (!!nodes.find(n => n.public_key === pair.public_key)) {
            return;
          }

          return nodes.push({public_key: pair.public_key});
        });

        const nodesWithPeers = nodes.map(node => {
          const publicKey = node.public_key;

          return {
            channels: node.channels || [],
            confidence: node.confidence || undefined,
            last_failed_forward_at: node.last_failed_forward_at || undefined,
            peers: peers.filter(n => n.public_key === publicKey).map(n => ({
              confidence: n.confidence,
              last_failed_forward_at: n.last_failed_forward_at,
              min_relevant_tokens: n.min_relevant_tokens,
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
