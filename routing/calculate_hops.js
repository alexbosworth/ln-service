const PriorityQueue = require('@datastructures-js/priority-queue');

const policyFee = require('./policy_fee');

const maxMillitokens = 21 * 1e6 * 1e8;
const mtokPerTok = 1e3;
const queueStart = 1;

/** Calculate hops between start and end nodes

  {
    channels: [{
      capacity: <Capacity Tokens Number>
      id: <Standard Channel Id String>
      policies: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <CLTV Delta Number>
        fee_rate: <Fee Rate Number>
        is_disabled: <Channel is Disabled Bool>
        min_htlc_mtokens: <Minimum HTLC Millitokens String>
        public_key: <Public Key Hex String>
      }]
    }]
    end: <End Public Key Hex String>
    [ignore]: [{
      [channel]: <Standard Format Channel Id String>
      public_key: <Public Key Hex String>
    }]
    mtokens: <Millitokens Number>
    start: <Start Public Key Hex String>
  }

  @throws
  <Error>

  @returns via cbk
  {
    [hops]: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      channel: <Standard Channel Id String>
      channel_capacity: <Channel Capacity Tokens Number>
      cltv_delta: <CLTV Delta Number>
      fee_rate: <Fee Rate Number>
      public_key: <Public Key Hex String>
    }]
  }
*/
module.exports = ({channels, end, ignore, mtokens, start}) => {
  if (mtokens > maxMillitokens) {
    throw new Error('ExpectedFewerTokensForHopCalculation');
  }

  const distances = {};
  const next = {};
  const queue = PriorityQueue();

  // Set all distances to Infinity, meaning the nodes cannot be reached
  channels.forEach(({policies}) => {
    return policies.forEach(policy => {
      distances[policy.public_key] = {
        distance: Infinity,
        public_key: policy.public_key,
      };

      next[policy.public_key] = null;

      return;
    });
  });

  distances[end] = {
    distance: 0,
    fee: 0,
    public_key: start,
    receive: mtokens,
  };

  const checkEdge = ({channel, from, to}) => {
    if (from !== start && !!channel.is_disabled) {
      return;
    }

    const {id} = channel;
    const mtokensToSend = distances[to].receive;

    if (channel.capacity * mtokPerTok < mtokensToSend) {
      return;
    }

    const policy = channel.policies.find(n => n.public_key === from);

    if (!!policy.is_disabled || policy.min_htlc_mtokens > mtokensToSend) {
      return;
    }

    if (!!(ignore || []).find(n => !n.channel && n.public_key === from)) {
      return;
    }

    if (!!(ignore || []).find(n => n.channel === id && n.public_key === to)) {
      return;
    }

    const {fee} = from === start ? {fee: 0} : policyFee({policy, mtokens});
    const cltv = from === start ? 0 : policy.cltv_delta;
    const peer = channel.policies.find(n => n.public_key !== from);
    const prospectiveDistance = distances[to].distance + fee;

    if (prospectiveDistance >= distances[from].distance) {
      return;
    }

    distances[from] = {
      fee,
      distance: prospectiveDistance,
      public_key: from,
      receive: mtokensToSend + fee,
    };

    next[from] = {
      base_fee_mtokens: peer.base_fee_mtokens,
      channel: channel.id,
      channel_capacity: channel.capacity,
      cltv_delta: peer.cltv_delta,
      fee_rate: peer.fee_rate,
      public_key: peer.public_key,
    };

    queue.enqueue(from, prospectiveDistance + queueStart);

    return;
  };

  queue.enqueue(end, distances[end].distance + queueStart);

  // Pull from the priority queue to check edges
  while (!queue.isEmpty()) {
    const bestNode = queue.dequeue();

    if (bestNode === start) {
      break;
    }

    channels
      .filter(({policies}) => {
        // Eliminate empty policies
        if (!!policies.find(policy => !policy.public_key)) {
          return false;
        }

        // Eliminate policies that aren't the best node
        return !!policies.find(policy => policy.public_key === bestNode);
      })
      .forEach(channel => {
        const policy = channel.policies.find(n => n.public_key !== bestNode);

        // Check edge between the channel peers
        return checkEdge({channel, from: policy.public_key, to: bestNode});
      });
  }

  // Exit early when there is no path
  if (!next[start]) {
    return {};
  }

  let current = start;
  const hops = [];

  // Map hops to a series
  while (current !== end) {
    hops.push(next[current]);

    current = next[current].public_key;
  }

  return {hops};
};
