const asyncAuto = require('async/auto');

const getWalletInfo = require('./get_wallet_info');

const countGroupingFactor = 3;

/** Get network graph

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
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
module.exports = (args, cbk) => {
  return asyncAuto({
    validate: (cbk) => {
      if (!args.lnd_grpc_api) {
        return cbk([500, 'Missing lnd grpc api', args]);
      }

      return cbk();
    },

    getGraph: ['validate', (res, cbk) => {
      return args.lnd_grpc_api.describeGraph({}, (err, networkGraph) => {
        if (!!err) {
          return cbk([500, 'Get network graph error', err]);
        }

        if (!networkGraph) {
          return cbk([503, 'Expected network graph'], networkGraph);
        }

        if (!Array.isArray(networkGraph.edges)) {
          return cbk([503, 'Expected network graph edges'], networkGraph);
        }

        if (!Array.isArray(networkGraph.nodes)) {
          return cbk([503, 'Expected network graph nodes'], networkGraph);
        }

        return cbk(null, networkGraph);
      });
    }],

    getWalletInfo: ['validate', (res, cbk) => {
      return getWalletInfo({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    }],

    graph: ['getGraph', 'getWalletInfo', (res, cbk) => {
      const channelCount = {};
      const graph = res.getGraph;
      const ownKey = res.getWalletInfo.public_key;

      graph.edges = graph.edges.map((n) => {
        [n.node1_pub, n.node2_pub].forEach((n) => {
          channelCount[n] = channelCount[n] || [].length;
          return channelCount[n]++;
        });

        return {
          capacity: n.capacity,
          from_self: n.node1_pub === ownKey,
          last_update: n.last_update,
          source: n.node1_pub,
          target: n.node2_pub,
          to_self: n.node2_pub === ownKey,
        };
      });

      graph.nodes = graph.nodes.map((n) => {
        const count = channelCount[n.pub_key] || [].length;

        const community = Math.round(count / countGroupingFactor);

        return {
          alias: n.alias,
          color: n.color,
          community: !channelCount[n.pub_key] ? [].length : community,
          id: n.pub_key,
          is_self: n.pub_key === ownKey,
          last_update: n.last_update,
        };
      });

      graph.nodes = graph.nodes.filter((n) => {
        return !!channelCount[n.id];
      });

      graph.own_node = {
        channel_count: channelCount[ownKey] || [].length,
        id: ownKey,
      };

      return cbk(null, graph);
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, res.graph);
  });
};

