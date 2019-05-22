const {isNumber} = require('lodash');
const {isString} = require('lodash');

const rowTypes = require('./conf/row_types');

const decBase = 10;

/** Get network info

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
  {
    average_channel_size: <Tokens Number>
    channel_count: <Channels Count Number>
    max_channel_size: <Tokens Number>
    [median_channel_size]: <Median Channel Tokens Number>
    min_channel_size: <Tokens Number>
    node_count: <Node Count Number>
    total_capacity: <Total Capacity Number>
    type: <Row Type String>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.default || !lnd.default.getNetworkInfo) {
    return cbk([400, 'ExpectedLndForNetworkInfoRequest']);
  }

  return lnd.default.getNetworkInfo({}, (err, networkInfo) => {
    if (!!err) {
      return cbk([503, 'GetNetworkInfoErr', err]);
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

    return cbk(null, {
      average_channel_size: networkInfo.avg_channel_size,
      channel_count: networkInfo.num_channels,
      max_channel_size: parseInt(networkInfo.max_channel_size, decBase),
      median_channel_size: parseInt(medianChannelSize, decBase) || undefined,
      min_channel_size: parseInt(networkInfo.min_channel_size, decBase),
      node_count: networkInfo.num_nodes,
      total_capacity: parseInt(networkInfo.total_network_capacity, decBase),
      type: rowTypes.network_info,
    });
  });
};
