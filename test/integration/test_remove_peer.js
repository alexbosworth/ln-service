const {readFileSync} = require('fs');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {connectChainNode} = require('./../macros');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const getPeers = require('./../../getPeers');
const getWalletInfo = require('./../../getWalletInfo');
const removePeer = require('./../../removePeer');
const {spawnLnd} = require('./../macros');

const maturityCount = 100;

// Removing peers should result in a removed peer
test(`Remove a peer`, async ({end, equal}) => {
  const lnds = [await spawnLnd({}), await spawnLnd({})];

  const [control, target] = lnds;

  const cert = readFileSync(control.chain_rpc_cert);
  const connect = `${target.listen_ip}:${target.chain_listen_port}`;
  const host = control.listen_ip;
  const pass = control.chain_rpc_pass;
  const port = control.chain_rpc_port;
  const targetNode = await getWalletInfo({lnd: target.lnd});
  const user = control.chain_rpc_user;

  await connectChainNode({cert, connect, host, pass, port, user});

  await generateBlocks({cert, host, pass, port, user, count: maturityCount});

  const controlWallet = await getWalletInfo({lnd: control.lnd});
  const targetWallet = await getWalletInfo({lnd: target.lnd});

  equal(controlWallet.is_synced_to_chain, true, 'Control syncs to chain');
  equal(targetWallet.is_synced_to_chain, true, 'Target syncs to chain');

  await delay(2000);

  await addPeer({
    lnd: control.lnd,
    public_key: targetNode.public_key,
    socket: `${target.listen_ip}:${target.listen_port}`,
  });

  await delay(2000);

  const {peers} = await getPeers({lnd: control.lnd});

  await delay(2000);

  const [targetPeer] = peers;

  equal(targetPeer.public_key, targetWallet.public_key, 'Peer is added');

  await removePeer({lnd: control.lnd, public_key: targetPeer.public_key});

  await delay(2000);

  const postRemovalPeers = await getPeers({lnd: control.lnd});

  equal(postRemovalPeers.peers.length, 0, 'Peer is removed');

  lnds.forEach(({kill}) => kill());

  return end();
});

