const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {chanFormat} = require('bolt07');
const {returnResult} = require('asyncjs-util');

const {getChannel} = require('./../lightning');

const decBase = 10;
const {isArray} = Array;
const msPerSec = 1e3;
const oddsDenominator = 1e6;
const {round} = Math;

/** Get the set of forwarding reputations

  Requires LND built with routerrpc build tag

  {
    lnd: <Authenticated LND gRPC API Object>
    [probability]: <Ignore Reputations Higher than N out of 1 Million Number>
    [tokens]: <Reputation Against Forwarding Tokens Number>
  }

  @returns via cbk or Promise
  {
    nodes: [{
      channels: [{
        id: <Standard Format Channel Id String>
        last_failed_forward_at: <Last Failed Forward Time ISO-8601 Date String>
        min_relevant_tokens: <Minimum Token Amount to Use This Estimate Number>
        success_odds: <Odds of Success Out of 1 Million Number>
        [to_public_key]: <To Public Key Hex String>
      }]
      general_success_odds: <Non-Channel-Specific Odds Out of 1 Million Number>
      [last_failed_forward_at]: <Last Failed Forward Time ISO-8601 Date String>
      public_key: <Node Identity Public Key Hex String>
    }]
  }
*/
module.exports = ({lnd, probability, tokens}, cbk) => {
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

          return cbk(null, res.nodes);
        });
      }],

      // Format and check reputations
      format: ['getReputations', ({getReputations}, cbk) => {
        return asyncMapSeries(getReputations, (node, cbk) => {
          if (!node) {
            return cbk([503, 'ExpectedNodeInMissionControlResponse']);
          }

          if (!isArray(node.channels)) {
            return cbk([503, 'ExpectedChannelFailureInfoInNodeResponse']);
          }

          if (!node.last_fail_time) {
            return cbk([503, 'ExpectedLastFailTimeInReputationResponse']);
          }

          if (!node.other_chan_success_prob) {
            return cbk([503, 'ExpectedChanSuccessProbForNode']);
          }

          if (!Buffer.isBuffer(node.pubkey)) {
            return cbk([503, 'ExpectedNodePublicKeyInResponse']);
          }

          const generalOdds = parseFloat(node.other_chan_success_prob);
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
            if (!!probability && successOdds > probability) {
              return cbk();
            }

            return getChannel({lnd, id: channelId}, (err, res) => {
              const policies = !!err || !res ? [] : res.policies;

              const peer = policies.find(n => n.public_key !== publicKey);

              return cbk(null, {
                id: channelId,
                last_failed_forward_at: new Date(fail).toISOString(),
                min_relevant_tokens: minTokens,
                success_odds: successOdds,
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
              general_success_odds: round(generalOdds * oddsDenominator),
              last_failed_forward_at: lastFail || undefined,
              public_key: publicKey,
            });
          });
        },
        cbk);
      }],

      // Final set of reputations
      reputations: ['format', ({format}, cbk) => {
        const nodes = format.filter(n => !n.last_failed_forward_at);

        return cbk(null, {nodes});
      }]
    },
    returnResult({reject, resolve, of: 'reputations'}, cbk));
  });
};
