const asyncAuto = require('async/auto');
const {isNumber} = require('lodash');
const {isString} = require('lodash');
const {returnResult} = require('asyncjs-util');

const decBase = 10;

/** Get network info

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    average_channel_size: <Tokens Number>
    channel_count: <Channels Count Number>
    max_channel_size: <Tokens Number>
    [median_channel_size]: <Median Channel Tokens Number>
    min_channel_size: <Tokens Number>
    node_count: <Node Count Number>
    [not_recently_updated_policy_count]: <Channel Edge Count Number>
    total_capacity: <Total Capacity Number>
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.default || !lnd.default.getNetworkInfo) {
          return cbk([400, 'ExpectedLndForNetworkInfoRequest']);
        }

        return cbk();
      },

      // Get network info
      getInfo: ['validate', ({}, cbk) => {
        return lnd.default.getNetworkInfo({}, (err, networkInfo) => {
          if (!!err) {
            return cbk([503, 'GetNetworkInfoErr', {err}]);
          }

          if (!isNumber(networkInfo.num_nodes)) {
            return cbk([503, 'ExpectedNumNodes']);
          }

          if (!isNumber(networkInfo.num_channels)) {
            return cbk([503, 'ExpectedNumChannels']);
          }

          if (!isString(networkInfo.total_network_capacity)) {
            return cbk([503, 'ExpectedTotalNetworkCapacity']);
          }

          if (!isNumber(networkInfo.avg_channel_size)) {
            return cbk([503, 'ExpectedAvgChannelSize']);
          }

          if (!isString(networkInfo.min_channel_size)) {
            return cbk([503, 'ExpectedMinChannelSize']);
          }

          if (!isString(networkInfo.max_channel_size)) {
            return cbk([503, 'ExpectedMaxChannelSize']);
          }

          const medianChannelSize = networkInfo.median_channel_size_sat || '0';
          const total = parseInt(networkInfo.total_network_capacity, decBase);

          const median = parseInt(medianChannelSize, decBase) || undefined;

          return cbk(null, {
            average_channel_size: networkInfo.avg_channel_size,
            channel_count: networkInfo.num_channels,
            max_channel_size: parseInt(networkInfo.max_channel_size, decBase),
            median_channel_size: median,
            min_channel_size: parseInt(networkInfo.min_channel_size, decBase),
            node_count: networkInfo.num_nodes,
            not_recently_updated_policy_count: networkInfo.num_zombie_chans,
            total_capacity: total,
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getInfo'}));
  });
};
