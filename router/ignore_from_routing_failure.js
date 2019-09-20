const {isArray} = Array;

/** Determine the ignore response given a routing failure

  {
    [channel]: <Failed Channel Id String>
    hops: [{
      channel: <Standard Format Channel Id String>
      public_key: <Paying Towards Public Key Hex String>
    }]
    index: <Failure At Hop Index Number>
    reason: <Routing Failure Reason String>
  }

  @throws
  <Error>

  @returns
  {
    ignore: [{
      [channel]: <Standard Format Channel Id String>
      [from_public_key]: <From Public Key Hex String>
      reason: <Failure Reason String>
      [to_public_key]: <To Public Key Hex String>
    }]
  }
*/
module.exports = args => {
  if (!isArray(args.hops) || !args.hops.length) {
    throw new Error('ExpectedArrayOfHopsToDeriveIgnores');
  }

  if (!!args.hops.find(n => !n.channel || !n.public_key)) {
    throw new Error('ExpectedArrayOfHopsWithChannelsAndKeysToDeriveIgnores');
  }

  if (args.index === undefined) {
    throw new Error('ExpectedIndexOfFailureToDeriveIgnores');
  }

  if (!args.reason) {
    throw new Error('ExpectedReasonForFailureToDeriveIgnores');
  }

  // Exit early when no forwarding node failed
  if (args.index === args.hops.length) {
    return {ignore: []};
  }

  if (!args.hops[args.index]) {
    throw new Error('ExpectedHopDetailsAtFailureIndex');
  }

  const failIndex = args.hops.findIndex(n => n.channel === args.channel);
  const finalIndex = args.hops.length - 1;
  const ignore = [];
  const toPublicKey = args.hops[args.index].public_key;

  if (!args.channel && args.reason === 'UnknownNextPeer') {
    ignore.push({reason: args.reason, to_public_key: toPublicKey});

    return {ignore};
  }

  const failedHop = args.hops[failIndex];
  const forwardingHop = failIndex > 0 ? args.hops[failIndex - 1] : null;
  const nextHop = failIndex < finalIndex ? args.hops[failIndex + 1] : null;

  // The failed hop itself is always potentially to blame
  if (!!failedHop && !!args.channel) {
    ignore.push({
      channel: args.channel,
      from_public_key: (args.hops[failIndex - 1] || {}).public_key,
      reason: args.reason,
      to_public_key: failedHop.public_key,
    });
  }

  // For some failures, other hops may be at fault
  switch (args.reason) {
  case 'AmountBelowMinimum':
  case 'ExpiryTooFar':
  case 'ExpiryTooSoon':
  case 'FeeInsufficient':
  case 'IncorrectCltvExpiry':
    if (!failIndex || !forwardingHop) {
      break;
    }

    // The forwarding hop is potentially to blame
    ignore.push({
      reason: args.reason,
      to_public_key: forwardingHop.public_key,
    });
    break;

  // A node failure implies that the node itself is having issues
  case 'TemporaryNodeFailure':
    ignore.push({reason: args.reason, to_public_key: toPublicKey});
    break;

  case 'UnknownNextPeer':
    if (failIndex === finalIndex) {
      break;
    }

    // If the peer is unknown, it could be that the next hop to blame
    ignore.push({
      channel: nextHop.channel,
      from_public_key: (args.hops[failIndex] || {}).public_key,
      reason: args.reason,
      to_public_key: nextHop.public_key,
    });
    break;

  default:
    break;
  }

  return {ignore};
};
