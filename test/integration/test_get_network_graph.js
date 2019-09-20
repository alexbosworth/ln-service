const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getNetworkGraph} = require('./../../');
const {getNode} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const {ceil} = Math;
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;

// Getting the network graph should return the public nodes and connections
test(`Get network graph`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {control} = cluster;
  const {lnd} = control;

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  await cluster.generate({count: confirmationCount, node: control});

  await waitForChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  await delay(2000);

  const [expectedChannel] = (await getChannels({lnd})).channels;
  const expectedNode = await getWalletInfo({lnd});
  const graph = await getNetworkGraph({lnd});

  const node = graph.nodes.find(n => n.public_key === control.public_key);
  const [channel] = graph.channels;

  const nodeDetails = await getNode({lnd, public_key: node.public_key});

  if (!!nodeDetails && !!nodeDetails.channels.length) {
    const [chan] = nodeDetails.channels;

    // chan.policies.forEach(policy => delete policy.updated_at);

    deepIs(chan, channel, 'Graph channel matches node details channel');
  }

  equal(node.alias, expectedNode.public_key.slice(0, 20), 'Node alias is own');
  equal(node.color, '#3399ff', 'Node color is default');
  equal(node.public_key, expectedNode.public_key, 'Node pubkey is own');
  deepIs(node.sockets, [`${control.listen_ip}:${control.listen_port}`], 'ip');
  equal(new Date() - new Date(node.updated_at) < 10000, true, 'Recent update');

  channel.policies.forEach(policy => {
    equal(policy.base_fee_mtokens, '1000', 'Default channel base fee');
    equal(policy.cltv_delta, 40, 'Default channel CLTV delta');
    equal(policy.fee_rate, 1, 'Default channel fee rate');
    equal(policy.is_disabled, false, 'Channels are active');
    equal(policy.max_htlc_mtokens, `${ceil(channel.capacity * 0.99)}000`);
    equal(policy.min_htlc_mtokens, '1000', 'Default min htlc value');
    equal(!!policy.public_key, true, 'Policy has public key');
    equal(new Date() - new Date(policy.updated_at) < 9999, true, 'Updated at');

    return;
  });

  equal(channel.capacity, expectedChannel.capacity, 'Channel capacity');
  equal(channel.id, expectedChannel.id, 'Channel id');
  equal(channel.transaction_id, expectedChannel.transaction_id, 'Chan tx id');
  equal(channel.transaction_vout, expectedChannel.transaction_vout, 'Tx Vout');
  equal(new Date() - new Date(channel.updated_at) < 9999, true, 'Updated at');

  await cluster.kill({});

  return end();
});
