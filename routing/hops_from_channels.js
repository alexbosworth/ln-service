const {intersection} = require('lodash');

/** Derive policy hops from an in-order set of channels with dual policies

  {
    channels: [{
      capacity: <Maximum Tokens Number>
      destination: <Next Hop Destination Public Key String>
      id: <Channel Id String>
      policies: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged Per Million Tokens Number>
        is_disabled: <Channel Is Disabled Bool>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
        public_key: <Node Public Key String>
      }]
    }]
  }

  @throws
  <Error>

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
module.exports = ({channels}) => {
  if (!Array.isArray(channels) || !channels.length) {
    throw new Error('ExpectedChannelsToDeriveHops');
  }

  const hops = channels.map((channel, i, chans) => {
    if (!channel.capacity) {
      throw new Error('ExpectedChannelCapacityForChannelHop');
    }

    if (!channel.destination) {
      throw new Error('ExpectedNextHopPublicKey');
    }

    if (!channel.id) {
      throw new Error('ExpectedChannelIdForTranslationToChannelHop');
    }

    if (!Array.isArray(channel.policies)) {
      throw new Error('ExpectedArrayOfPoliciesForChannelInHop');
    }

    const nextHop = channel.destination;

    const policy = channel.policies.find(n => n.public_key === nextHop);

    if (!policy) {
      return null;
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

  return {hops: hops.filter(n => !!n)};
};

