const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getNode} = require('./../../');
const {getWalletInfo} = require('./../../');
const {setupChannel} = require('./../macros');
const {updateRoutingFees} = require('./../../');

const baseFee = 1337;
const channelCapacityTokens = 1e6;
const cltvDelta = 42;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultAliasLength = '00000000000000000000'.length;
const feeRate = 21;
const mtokPerTok = BigInt(1e3);

// Getting a node should return the public graph node info
test(`Get node`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {control} = cluster;

  const {generate} = cluster;
  const {lnd} = control;

  const controlToTarget = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  const targetToRemote = await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  await updateRoutingFees({
    lnd,
    base_fee_tokens: baseFee,
    cltv_delta: cltvDelta,
    fee_rate: feeRate,
    transaction_id: controlToTarget.transaction_id,
    transaction_vout: controlToTarget.transaction_vout,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  await delay(3000);

  const controlListenIp = cluster.control.listen_ip;
  const controlListenPort = cluster.control.listen_port;

  const controlPublicKey = (await getWalletInfo({lnd})).public_key;

  const node = await getNode({lnd, public_key: controlPublicKey});

  {
    const {channels} = await getNode({
      lnd,
      is_omitting_channels: true,
      public_key: controlPublicKey,
    });

    equal(channels.length, [].length, 'Channels are omitted')
  }

  if (!!node.channels.length) {
    const [{policies}] = node.channels;

    const policy = policies.find(n => n.public_key === control.public_key);

    equal(BigInt(policy.base_fee_mtokens), BigInt(baseFee)*mtokPerTok, 'Base');
    equal(policy.cltv_delta, cltvDelta, 'Got expected cltv delta');
    equal(policy.fee_rate, feeRate, 'Got expected fee rate');
    equal(policy.is_disabled, false, 'Channel is not disabled');
    equal(policy.max_htlc_mtokens, '990000000', 'Max HTLC mtokens returned');
    equal(policy.min_htlc_mtokens, '1000', 'Min HTLC mtokens returned');
  }

  const [socket] = node.sockets;

  equal(node.alias, controlPublicKey.slice(0, defaultAliasLength), 'Alias');
  equal(node.color, '#3399ff', 'Color');
  equal(node.sockets.length, 1, 'Socket');
  equal(socket.socket, `${controlListenIp}:${controlListenPort}`, 'Ip, port');
  equal(socket.type, 'tcp', 'Socket type');
  equal(node.updated_at.length, 24, 'Update date');

  await cluster.kill({});

  return end();
});
