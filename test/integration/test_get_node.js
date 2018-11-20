const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const getChannels = require('./../../getChannels');
const getNode = require('./../../getNode');
const getWalletInfo = require('./../../getWalletInfo');
const openChannel = require('./../../openChannel');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultAliasLength = '00000000000000000000'.length;

// Getting a node should return the public graph node info
test(`Get node`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {control} = cluster;

  const {lnd} = control;

  await delay(3000);

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await delay(2000);

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await delay(2000);

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await delay(2000);

  const controlListenIp = cluster.control.listen_ip;
  const controlListenPort = cluster.control.listen_port;

  const controlPublicKey = (await getWalletInfo({lnd})).public_key;

  const node = await getNode({lnd, public_key: controlPublicKey});

  const [socket] = node.sockets;

  equal(node.alias, controlPublicKey.slice(0, defaultAliasLength), 'Alias');
  equal(node.capacity, 0, 'Capacity');
  equal(node.channel_count, 0, 'Channel count');
  equal(node.color, '#3399ff', 'Color');
  equal(node.sockets.length, 1, 'Socket');
  equal(socket.socket, `${controlListenIp}:${controlListenPort}`, 'Ip, port');
  equal(socket.type, 'tcp', 'Socket type');
  equal(node.updated_at.length, 24, 'Update date');

  await cluster.kill({});

  return end();
});

