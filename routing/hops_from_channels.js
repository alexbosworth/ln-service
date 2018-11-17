const {intersection} = require('lodash');

/** Derive policy hops from an in-order set of channels with dual policies

  {
    source: <Source Public Key Hex String>
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
    destination: <Destination Public Key Hex String>
  }

  @throws
  <ExpectedArrayOfPoliciesForChannelInHop Error>
  <ExpectedChannelCapacityForChannelHop Error>
  <ExpectedChannelsToDeriveHops Error>
  <ExpectedDestinationForChannels Error>

  @returns
  {
    hops: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      channel_capacity: <Maximum Tokens Number>
      channel_id: <Channel Id String>
      cltv_delta: <CLTV Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
      public_key: <Public Key Hex String>
    }]
  }
*/
module.exports = ({channels, destination, source}) => {
  if (!Array.isArray(channels) || !channels.length) {
    throw new Error('ExpectedChannelsToDeriveHops');
  }

  if (!destination) {
    throw new Error('ExpectedDestinationForChannels');
  }

  const hops = channels.map((channel, i, chans) => {
    if (!channel.capacity) {
      throw new Error('ExpectedChannelCapacityForChannelHop');
    }

    if (!channel.id) {
      throw new Error('ExpectedChannelIdForTranslationToChannelHop');
    }

    if (!Array.isArray(channel.policies)) {
      throw new Error('ExpectedArrayOfPoliciesForChannelInHop');
    }

    const nextChan = chans[i + [channel].length];
    const {policies} = channel;

    const [firstPolicy] = policies;

    // Neighbor channel's public keys
    const nextKeys = !nextChan ? [] : nextChan.policies.map(n => n.public_key);

    // Linking public key between this channel and the next's
    const [link] = intersection(policies.map(n => n.public_key), nextKeys);

    let policy;
    let nextHop;

    if (policies.find(n => n.public_key === destination)) {
      nextHop = destination;
      policy = policies.find(n => n.public_key === destination);
    } else if (!i) {
      nextHop = link || policies.find(n => n.public_key !== source).public_key;
      policy = policies.find(n => n.public_key !== link);
    } else {
      nextHop = link;
      policy = policies.find(n => n.public_key === link);
    }

    if (!policy) {
      throw new Error('ExpectedLinkingPolicyForHops');
    }

    return {
      base_fee_mtokens: policy.base_fee_mtokens,
      channel_capacity: channel.capacity,
      channel_id: channel.id,
      cltv_delta: policy.cltv_delta,
      fee_rate: policy.fee_rate,
      public_key: nextHop,
    };
  });

  return {hops};
};

