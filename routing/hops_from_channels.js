const defaultCltvDelta = 40;
const {isArray} = Array;
const payNodesCount = 2;

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

  // Calculate destinations of hops
  const hopDestinations = channels.slice().reverse()
    .map(channel => {
      if (!isArray(channel.policies)) {
        throw new Error('ExpectedChannelPoliciesWhenCalculatingHops');
      }

      const next = nextNode || channel.destination;

      nextNode = channel.policies.map(n => n.public_key).find(n => n !== next);

      return next;
    })
    .reverse();

  // Calculate the edge policies for each forward
  const hops = channels.map((channel, i, chans) => {
    if (!destination && !channel.destination) {
      throw new Error('ExpectedNextHopPublicKey');
    }

    if (!channel.id) {
      throw new Error('ExpectedChannelIdForTranslationToChannelHop');
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

    let cltvDelta = (overridePolicy || policy).cltv_delta || defaultCltvDelta;
    const payIndex = chans.length - payNodesCount;

    // The end of a route is where the penultimate node pays the ultimate one.
    if (i < payIndex) {
      cltvDelta = peer.cltv_delta;
    } else if (i === payIndex) {
      const endPolicies = nextPolicy.policies;
      const payingKey = hopDestinations[i];

      cltvDelta = endPolicies.find(n => n.public_key === payingKey).cltv_delta;
    }

    return {
      base_fee_mtokens: (overridePolicy || policy).base_fee_mtokens,
      channel: channel.id,
      channel_capacity: channel.capacity,
      cltv_delta: cltvDelta || defaultCltvDelta,
      fee_rate: (overridePolicy || policy).fee_rate,
      public_key: nextHop,
    };
  });

  const [firstDestination] = hopDestinations;

  const [firstChannel, secondChannel] = channels;

  const initialChannels = !secondChannel ? firstChannel : secondChannel;

  const initialPolicies = initialChannels.policies;

  const initial = initialPolicies.find(n => n.public_key === firstDestination);

  return {
    hops: hops.filter(n => !!n),
    initial_cltv: (initial || {cltv_delta: defaultCltvDelta}).cltv_delta,
  };
};
