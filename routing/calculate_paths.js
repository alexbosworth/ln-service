const {MinPriorityQueue} = require('@datastructures-js/priority-queue');

const calculateHops = require('./calculate_hops');
const isEqualPath = require('./is_equal_path');

const defaultLimit = 20;

/** Calculate multiple routes to a destination

  {
    channels: [{
      capacity: <Capacity Tokens Number>
      id: <Standard Channel Id String>
      policies: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <CLTV Delta Number>
        fee_rate: <Fee Rate Number>
        is_disabled: <Channel is Disabled Bool>
        max_htlc_mtokens: <Maximum HTLC Millitokens String>
        min_htlc_mtokens: <Minimum HTLC Millitokens String>
        public_key: <Public Key Hex String>
      }]
    }]
    end: <End Public Key Hex String>
    [limit]: <Paths To Return Limit Number>
    mtokens: <Millitokens Number>
    start: <Start Public Key Hex String>
  }

  @throws
  <Error>

  @returns
  {
    [paths]: [{
      hops: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        channel: <Standard Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        cltv_delta: <CLTV Delta Number>
        fee_rate: <Fee Rate Number>
        public_key: <Public Key Hex String>
      }]
    }]
  }
*/
module.exports = ({channels, end, limit, mtokens, start}) => {
  const candidatePaths = new MinPriorityQueue();
  const shortestPaths = [];
  const startingPath = calculateHops({channels, end, mtokens, start});

  // Exit early when there is no path to the destination
  if (!startingPath.hops) {
    return {};
  }

  shortestPaths.push([{public_key: start}].concat(startingPath.hops));

  for (let k = shortestPaths.length; k < limit || defaultLimit; k++) {
    const prevShortest = shortestPaths[k - 1] || [];

    for (let i = 0; i < prevShortest.length - 1; i++) {
      const ignore = [];
      const start = prevShortest[i].public_key;
      const rootPath = prevShortest.slice(0, i + 1);

      // Add edges to ignore
      shortestPaths.forEach(path => {
        const next = i + 1;

        if (path.length <= next) {
          return;
        }

        const paths = [rootPath, path.slice(0, next)];

        if (!isEqualPath({paths})) {
          return;
        }

        return ignore.push({
          channel: path[next].channel,
          public_key: path[next].public_key,
        });
      });

      // Add nodes to ignore
      rootPath
        .filter(hop => hop.public_key !== start)
        .forEach(hop => ignore.push({public_key: hop.public_key}));

      const {hops} = calculateHops({channels, end, ignore, mtokens, start});

      if (!hops) {
        continue;
      }

      candidatePaths.enqueue([].concat(rootPath).concat(hops), 1);
    }

    if (candidatePaths.isEmpty()) {
      break;
    }

    shortestPaths.push(candidatePaths.dequeue().element);
  }

  const paths = shortestPaths.filter(n => !!n).map(n => ({hops: n.slice(1)}));

  return {paths};
};
