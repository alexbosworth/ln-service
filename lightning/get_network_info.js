const {isNumber} = require('lodash');
const {isString} = require('lodash');

const rowTypes = require('./conf/row_types');

const decBase = 10;

/** Get network info

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    average_channel_size: <Tokens Number>
    channel_count: <Channels Count Number>
    maximum_channel_size: <Tokens Number>
    minimum_channel_size: <Tokens Number>
    node_count: <Node Count Number>
    total_capacity: <Total Capacity Number>
    type: <Row Type String>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.getNetworkInfo) {
    return cbk([400, 'ExpectedLndForNetworkInfoRequest']);
  }

  return lnd.getNetworkInfo({}, (err, networkInfo) => {
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

    return cbk(null, {
      average_channel_size: networkInfo.avg_channel_size,
      channel_count: networkInfo.num_channels,
      maximum_channel_size: parseInt(networkInfo.max_channel_size, decBase),
      minimum_channel_size: parseInt(networkInfo.min_channel_size, decBase),
      node_count: networkInfo.num_nodes,
      total_capacity: parseInt(networkInfo.total_network_capacity, decBase),
      type: rowTypes.network_info,
    });
  });
};

