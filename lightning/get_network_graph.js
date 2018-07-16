const asyncAuto = require('async/auto');

const getWalletInfo = require('./get_wallet_info');
const {returnResult} = require('./../async-util');

const countGroupingFactor = 3;

/** Get network graph

  {
    lnd: <Object>
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
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!lnd) {
        return cbk([500, 'ExpectedLnd']);
      }

      return cbk();
    },

    // Get network graph
    getGraph: ['validate', ({}, cbk) => {
      return lnd.describeGraph({}, (err, networkGraph) => {
        if (!!err) {
          return cbk([503, 'GetNetworkGraphError', err]);
        }

        if (!networkGraph) {
          return cbk([503, 'ExpectedNetworkGraph']);
        }

        if (!Array.isArray(networkGraph.edges)) {
          return cbk([503, 'ExpectedNetworkGraphEdges', networkGraph]);
        }

        if (!Array.isArray(networkGraph.nodes)) {
          return cbk([503, 'ExpectedNetworkGraphNodes', networkGraph]);
        }

        return cbk(null, networkGraph);
      });
    }],

    // Get wallet info
    getWalletInfo: ['validate', (_, cbk) => getWalletInfo({lnd}, cbk)],

    // Network graph
    graph: ['getGraph', 'getWalletInfo', ({getGraph, getWalletInfo}, cbk) => {
      const channelCount = {};
      const graph = getGraph;
      const ownKey = getWalletInfo.public_key;

      graph.edges = graph.edges.map(n => {
        [n.node1_pub, n.node2_pub].forEach(n => {
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

      graph.nodes = graph.nodes.map(n => {
        const count = channelCount[n.pub_key] || [].length;

        const community = Math.round(count / countGroupingFactor);

        return {
          addresses: n.addresses.map(n => n.addr),
          alias: n.alias,
          color: n.color,
          community: !channelCount[n.pub_key] ? [].length : community,
          id: n.pub_key,
          is_self: n.pub_key === ownKey,
          last_update: n.last_update,
        };
      });

      graph.nodes = graph.nodes.filter(n => !!channelCount[n.id]);

      graph.own_node = {
        channel_count: channelCount[ownKey] || [].length,
        id: ownKey,
      };

      return cbk(null, graph);
    }],
  },
  returnResult({of: 'graph'}, cbk));
};

