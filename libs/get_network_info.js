const _ = require('lodash');

const rowTypes = require('./../config/row_types');

/** Get network info

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  {
    average_channel_size: <Satoshis Number>
    channel_count: <Number>
    maximum_channel_size: <Satoshis Number String>
    minimum_channel_size: <Satoshis Number String>
    node_count: <Number>
    total_capacity: <Satoshis Number String>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.getNetworkInfo({}, (err, networkInfo) => {
    if (!!err) { return cbk([500, 'Get network info error', err]); }

    if (!_(networkInfo.num_nodes).isNumber()) {
      return cbk([500, 'Expected num_nodes', networkInfo]);
    }

    if (!_(networkInfo.num_channels).isNumber()) {
      return cbk([500, 'Expected num_channels', networkInfo]);
    }

    if (!_(networkInfo.total_network_capacity).isString()) {
      return cbk([500, 'Expected total_network_capacity', networkInfo]);
    }

    if (!_(networkInfo.avg_channel_size).isNumber()) {
      return cbk([500, 'Expected avg_channel_size', networkInfo]);
    }

    if (!_(networkInfo.min_channel_size).isString()) {
      return cbk([500, 'Expected min_channel_size', networkInfo]);
    }

    if (!_(networkInfo.max_channel_size).isString()) {
      return cbk([500, 'Expected min_channel_size', networkInfo]);
    }

    return cbk(null, {
      average_channel_size: networkInfo.avg_channel_size,
      channel_count: networkInfo.num_channels,
      maximum_channel_size: networkInfo.max_channel_size,
      minimum_channel_size: networkInfo.min_channel_size,
      node_count: networkInfo.num_nodes,
      total_capacity: networkInfo.total_network_capacity,
      type: rowTypes.network_info,
    });
  });
};

