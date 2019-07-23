const {isArray} = Array;

/** Derive policy hops from an in-order set of channels with dual policies

  Either individual destinations or a final destination is required

  {
    channels: [{
      capacity: <Maximum Tokens Number>
      [destination]: <Next Hop Destination Public Key String>
      id: <Standard Format Channel Id String>
      policies: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged Per Million Tokens Number>
        is_disabled: <Channel Is Disabled Bool>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
        public_key: <Node Public Key String>
      }]
    }]
    [destination]: <Destination Public Key Hex String>
  }

  @throws
  <Error>

  @returns
  {
    hops: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      channel: <Standard Format Channel Id String>
      channel_capacity: <Maximum Tokens Number>
      cltv_delta: <CLTV Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
      public_key: <Public Key Hex String>
    }]
  }
*/
module.exports = ({channels, destination}) => {
  if (!isArray(channels) || !channels.length) {
    throw new Error('ExpectedChannelsToDeriveHops');
  }

  let nextNode = destination;

  const hopDestinations = channels.slice().reverse()
    .map(channel => {
      if (!isArray(channel.policies)) {
        throw new Error('ExpectedChannelPoliciesWhenCalculatingHops');
      }

      const next = nextNode;

      nextNode = channel.policies.map(n => n.public_key).find(n => n !== next);

      return next;
    })
    .reverse();

  const hops = channels.map((channel, i, chans) => {
    if (!destination && !channel.destination) {
      throw new Error('ExpectedNextHopPublicKey');
    }

    if (!channel.id) {
      throw new Error('ExpectedChannelIdForTranslationToChannelHop');
    }

    if (!Array.isArray(channel.policies)) {
      throw new Error('ExpectedArrayOfPoliciesForChannelInHop');
    }

    const nextHop = channel.destination || hopDestinations[i];
    const nextPolicy = chans[i + [channel].length];
    let overridePolicy;

    const peer = channel.policies.find(n => n.public_key === nextHop);
    const policy = channel.policies.find(n => n.public_key !== nextHop);

    if (!policy) {
      return null;
    }

    if (!i && !!nextPolicy) {
      overridePolicy = nextPolicy.policies.find(n => n.public_key === nextHop);
    }

    return {
      base_fee_mtokens: (overridePolicy || policy).base_fee_mtokens,
      channel: channel.id,
      channel_capacity: channel.capacity,
      cltv_delta: peer.cltv_delta,
      fee_rate: (overridePolicy || policy).fee_rate,
      public_key: nextHop,
    };
  });

  return {hops: hops.filter(n => !!n)};
};
