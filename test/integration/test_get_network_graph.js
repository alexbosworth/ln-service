const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getNetworkGraph} = require('./../../');
const {getNode} = require('./../../');
const {setupChannel} = require('./../macros');

const {ceil} = Math;
const interval = 250;
const size = 3;
const times = 50;

// Getting the network graph should return the public nodes and connections
test(`Get network graph`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {generate, lnd} = control;

  const expectedChannel = await setupChannel({generate, lnd, to: target});

  // Wait until the node shows up in the graph
  const graph = await asyncRetry({interval, times}, async () => {
    const networkGraph = await getNetworkGraph({lnd});

    if (!networkGraph.nodes.find(n => n.public_key === control.id)) {
      throw new Error('ExpectedToFindNodeInGraph');
    }

    return networkGraph;
  });

  const node = graph.nodes.find(n => n.public_key === control.id);
  const [channel] = graph.channels;

  const nodeDetails = await getNode({lnd, public_key: node.public_key});

  if (!!nodeDetails && !!nodeDetails.channels.length) {
    const [chan] = nodeDetails.channels;

    strictSame(chan, channel, 'Graph channel matches node details channel');
  }

  equal(node.alias, control.id.slice(0, 20), 'Node alias is own');
  equal(node.color, '#3399ff', 'Node color is default');
  equal(node.public_key, control.id, 'Node pubkey is own');
  equal(node.sockets.length, 1, 'Socket');
  equal(new Date() - new Date(node.updated_at) < 1e5, true, 'Recent update');

  channel.policies.forEach(policy => {
    equal(policy.base_fee_mtokens, '1000', 'Default channel base fee');
    equal(policy.cltv_delta, 40, 'Default channel CLTV delta');
    equal(policy.fee_rate, 1, 'Default channel fee rate');
    equal(policy.is_disabled, false, 'Channels are active');
    equal(policy.max_htlc_mtokens, `${ceil(channel.capacity * 0.99)}000`);
    equal(!!policy.min_htlc_mtokens, true, 'Default min htlc value');
    equal(!!policy.public_key, true, 'Policy has public key');
    equal(new Date() - new Date(policy.updated_at) < 1e5, true, 'Updated at');

    return;
  });

  equal(channel.capacity, expectedChannel.capacity, 'Channel capacity');
  equal(channel.id, expectedChannel.id, 'Channel id');
  equal(channel.transaction_id, expectedChannel.transaction_id, 'Chan tx id');
  equal(channel.transaction_vout, expectedChannel.transaction_vout, 'Tx Vout');
  equal(new Date() - new Date(channel.updated_at) < 1e5, true, 'Updated at');

  await kill({});

  return end();
});
