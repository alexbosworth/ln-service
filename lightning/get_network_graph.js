const asyncAuto = require('async/auto');

const getWalletInfo = require('./get_wallet_info');
const {returnResult} = require('./../async-util');

const countGroupingFactor = 3;
const decBase = 10;
const msPerSec = 1e3
const outpointSeparatorChar = ':';

/** Get network graph

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    edges: [{
      capacity: <Channel Capacity Tokens Number>
      from_self: <Channel Link From Self Bool>
      id: <Channel Id String>
      policies: [{
        base_fee_mtokens: <Bae Fee MilliTokens String>
        cltv_delta: <CLTV Height Delta Number>
        fee_rate: <Fee Rate In MilliTokens Per Million Number>
        is_disabled: <Edge is Disabled Bool>
        minimum_htlc_mtokens: <Minimum HTLC MilliTokens String>
      }]
      source: <Source Public Key String>
      target: <Target Public Key String>
      to_self: <Target is Self Bool>
      transaction_id: <Funding Transaction Id String>
      transaction_output_index: <Funding Transaction Output Index Number>
      updated_at: <Last Update Epoch ISO 8601 Date String>
    }]
    nodes: [{
      alias: <Name String>
      color: <Hex Encoded Color String>
      community: <Community Grouping Number>
      id: <Node Public Key String>
      is_self: <Node is Self Bool>
      sockets: [<Network Address and Port String>]
      updated_at: <Last Updated ISO 8601 Date String>
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
      if (!lnd || !lnd.describeGraph) {
        return cbk([400, 'ExpectedLndForGetNetworkGraphRequest']);
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
    getWalletInfo: ['validate', ({}, cbk) => getWalletInfo({lnd}, cbk)],

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

        const [txId, vout] = n.chan_point.split(outpointSeparatorChar);

        const policies = [n.node1_policy, n.node2_policy].map(n => {
          return {
            base_fee_mtokens: n.fee_base_msat,
            cltv_delta: n.time_lock_delta,
            fee_rate: parseInt(n.fee_rate_milli_sat, decBase),
            is_disabled: !!n.disabled,
            minimum_htlc_mtokens: n.min_htlc,
          };
        });

        return {
          policies,
          capacity: parseInt(n.capacity, decBase),
          from_self: n.node1_pub === ownKey,
          id: n.channel_id,
          source: n.node1_pub,
          target: n.node2_pub,
          to_self: n.node2_pub === ownKey,
          transaction_id: txId,
          transaction_output_index: parseInt(vout, decBase),
          updated_at: new Date(n.last_update * msPerSec).toISOString(),
        };
      });

      graph.nodes = graph.nodes.map(n => {
        const count = channelCount[n.pub_key] || [].length;

        const community = Math.round(count / countGroupingFactor);

        return {
          alias: n.alias,
          color: n.color,
          community: !channelCount[n.pub_key] ? [].length : community,
          id: n.pub_key,
          is_self: n.pub_key === ownKey,
          sockets: n.addresses.map(n => n.addr),
          updated_at: new Date(n.last_update).toISOString(),
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

