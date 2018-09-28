const {readFileSync} = require('fs');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {connectChainNode} = require('./../macros');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const getPeers = require('./../../getPeers');
const getWalletInfo = require('./../../getWalletInfo');
const {spawnLnd} = require('./../macros');

const addPeerDelayMs = 2000;
const maturityCount = 100;
const maturityDelayMs = 2000;
const peerDelayMs = 2000;

// Adding peers should result in a connected peer
test(`Add a peer`, async ({end, equal}) => {
  const lnds = [await spawnLnd({}), await spawnLnd({})];

  const [control, target] = lnds;

  const cert = readFileSync(control.chain_rpc_cert);
  const pass = control.chain_rpc_pass;
  const targetNode = await getWalletInfo({lnd: target.lnd});
  const user = control.chain_rpc_user;

  await connectChainNode({
    cert,
    pass,
    user,
    host: control.listen_ip,
    port: control.chain_rpc_port,
    connect: `${target.listen_ip}:${target.chain_listen_port}`,
  });

  await generateBlocks({
    cert,
    pass,
    user,
    count: maturityCount,
    host: control.listen_ip,
    port: control.chain_rpc_port,
  });

  const controlWallet = await getWalletInfo({lnd: control.lnd});
  const targetWallet = await getWalletInfo({lnd: target.lnd});

  equal(controlWallet.is_synced_to_chain, true, 'Control syncs to chain');
  equal(targetWallet.is_synced_to_chain, true, 'Target syncs to chain');

  await delay(maturityDelayMs);

  await addPeer({
    lnd: control.lnd,
    public_key: targetNode.public_key,
    socket: `${target.listen_ip}:${target.listen_port}`,
  });

  await delay(addPeerDelayMs);

  const {peers} = await getPeers({lnd: control.lnd});

  equal(peers.length, [target].length, 'A peer is added');

  const [targetPeer] = peers;

  equal(targetPeer.public_key, targetWallet.public_key, 'Target is added');

  await delay(peerDelayMs);

  lnds.forEach(({kill}) => kill());

  return end();
});

