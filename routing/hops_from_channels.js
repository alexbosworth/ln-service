const {intersection} = require('lodash');

/** Derive policy hops from an in-order set of channels with dual policies

  {
    channels: [{
      capacity: <Maximum Tokens Number>
      id: <Channel Id String>
      policies: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged Per Million Tokens Number>
        is_disabled: <Channel Is Disabled Bool>
        minimum_htlc_mtokens: <Minimum HTLC Millitokens Value String>
        public_key: <Node Public Key String>
      }]
    }]
    destination: <Final Destination Public Key Hex String>
  }

  @throws
  <ExpectedChannelsToDeriveHops Error>
  <ExpectedDestinationForChannels Error>
  <ExpectedLinkingPolicyForChannel Error>

  @returns
  {
    hops: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      channel_capacity: <Maximum Tokens Number>
      channel_id: <Channel Id String>
      cltv_delta: <CLTV Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
    }]
  }
*/
module.exports = ({channels, destination}) => {
  if (!Array.isArray(channels) || !channels.length) {
    throw new Error('ExpectedChannelsToDeriveHops');
  }

  if (!destination) {
    throw new Error('ExpectedDestinationForChannels');
  }

  const hops = channels.map((channel, i, chans) => {
    if (!channel.id) {
      throw new Error('ExpectedChannelIdForTranslationToChannelHop');
    }

    const nextChan = chans[i + [channel].length];
    const {policies} = channel;

    const nextKeys = !nextChan ? [] : nextChan.policies.map(n => n.public_key);

    const [link] = intersection(policies.map(n => n.public_key), nextKeys);

    let policy;

    if (!i) {
      policy = policies.find(n => n.public_key !== link);
    } else {
      policy = policies.find(n => n.public_key === (link || destination));
    }

    if (!policy) {
      throw new Error('ExpectedLinkingPolicyForChannel');
    }

    return {
      base_fee_mtokens: policy.base_fee_mtokens,
      channel_capacity: channel.capacity,
      channel_id: channel.id,
      cltv_delta: policy.cltv_delta,
      fee_rate: policy.fee_rate,
    };
  });

  return {hops};
};

