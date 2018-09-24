const {promisify} = require('util');

const {getNetworkGraph} = require('./');

/** Get network graph

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    edges: [{
      capacity: <Channel Capacity Tokens Number>
      from_self: <Channel Link From Self Bool>
      last_update: <Last Update Epoch Seconds Number>
      source: <Source Public Key String>
      target: <Target Public Key String>
      to_self: <Target is Self Bool>
    }]
    nodes: [{
      addresses: [<Network Address String>]
      alias: <Name String>
      color: <Hex Encoded Color String>
      community: <Community Grouping Number>
      id: <Node Public Key String>
      is_self: <Node is Self Bool>
      last_update: <Last Updated Seconds Number>
    }]
    own_node: {
      channel_count: <Total Channels Count Number>
      id: <Node Public Key String>
    }
  }
*/
module.exports = promisify(getNetworkGraph);

