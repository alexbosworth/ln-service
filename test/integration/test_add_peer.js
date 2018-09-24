const {promisify} = require('util');
const {readFileSync} = require('fs');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {connectChainNode} = require('./../macros');
const {generateBlocks} = require('./../macros');
const getPeers = require('./../../getPeers');
const getWalletInfo = require('./../../getWalletInfo');
const {spawnLnd} = require('./../macros');

const pass = 'pass';
const user = 'user';
const remotePeerSyncingError = 'StillSyncing';
const remoteServiceErrorCode = 503;

// Adding peers should result in a connected peer
test(`Add a peer`, async ({end, equal}) => {
  const lnds = [await promisify(spawnLnd)({}), await promisify(spawnLnd)({})];

  const [control, target] = lnds;

  const cert = readFileSync(control.chain_rpc_cert);
  const targetNode = await getWalletInfo({lnd: target.lnd});

  await promisify(connectChainNode)({
    cert,
    pass,
    user,
    host: control.listen_ip,
    port: control.chain_rpc_port,
    connect: `${target.listen_ip}:${target.chain_listen_port}`,
  });

  await promisify(generateBlocks)({
    cert,
    pass,
    user,
    count: 100,
    host: control.listen_ip,
    port: control.chain_rpc_port,
  });

  const controlWallet = await getWalletInfo({lnd: control.lnd});
  const targetWallet = await getWalletInfo({lnd: target.lnd});

  equal(controlWallet.is_synced_to_chain, true, 'Control syncs to chain');
  equal(targetWallet.is_synced_to_chain, true, 'Target syncs to chain');

  await promisify(setTimeout)(1000);

  await addPeer({
    lnd: control.lnd,
    public_key: targetNode.public_key,
    socket: `${target.listen_ip}:${target.listen_port}`,
  });

  const {peers} = await getPeers({lnd: control.lnd});

  const [targetPeer] = peers;

  equal(targetPeer.public_key, targetWallet.public_key, 'Peer is added');

  await promisify(setTimeout)(1000);

  lnds.forEach(({kill}) => kill());

  return end();
});

