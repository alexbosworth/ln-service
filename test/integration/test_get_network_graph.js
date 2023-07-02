const {deepStrictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getNetworkGraph} = require('./../../');
const {getNode} = require('./../../');

const {ceil} = Math;
const interval = 250;
const size = 3;
const times = 50;

// Getting the network graph should return the public nodes and connections
test(`Get network graph`, async () => {
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

    deepStrictEqual(chan, channel, 'Graph channel matches node details');
  }

  deepStrictEqual(node.alias, control.id.slice(0, 20), 'Node alias is own');
  deepStrictEqual(node.color, '#3399ff', 'Node color is default');
  deepStrictEqual(node.public_key, control.id, 'Node pubkey is own');
  deepStrictEqual(node.sockets.length, 1, 'Socket');
  deepStrictEqual(new Date() - new Date(node.updated_at) < 1e5, true, 'At');

  channel.policies.forEach(policy => {
    deepStrictEqual(policy.base_fee_mtokens, '1000', 'Default channel base');
    deepStrictEqual([40, 80].includes(policy.cltv_delta), true, 'Cltv delta');
    deepStrictEqual(policy.fee_rate, 1, 'Default channel fee rate');
    deepStrictEqual(policy.is_disabled, false, 'Channels are active');
    deepStrictEqual(
      policy.max_htlc_mtokens,
      `${ceil(channel.capacity * 0.99)}000`
    );
    deepStrictEqual(!!policy.min_htlc_mtokens, true, 'Default min htlc value');
    deepStrictEqual(!!policy.public_key, true, 'Policy has public key');
    deepStrictEqual(new Date()-new Date(policy.updated_at) < 1e5, true, 'At');

    return;
  });

  deepStrictEqual(channel.capacity, expectedChannel.capacity, 'Capacity');
  deepStrictEqual(channel.id, expectedChannel.id, 'Channel id');
  deepStrictEqual(channel.transaction_id, expectedChannel.transaction_id, 'T');
  deepStrictEqual(
    channel.transaction_vout,
    expectedChannel.transaction_vout,
    'Tx Vout'
  );
  deepStrictEqual(
    new Date() - new Date(channel.updated_at) < 1e5,
    true,
    'Updated at'
  );

  await kill({});

  return;
});
