const {readFileSync} = require('fs');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const getPeers = require('./../../getPeers');

const addPeerDelayMs = 2000;
const notFoundIndex = -1;

// Adding peers should result in a connected peer
test(`Add a peer`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const {peers} = await getPeers({lnd});
  const remoteNodeKey = cluster.remote_node_public_key;

  const connectedKeys = peers.filter(n => n.public_key);

  equal(connectedKeys.indexOf(remoteNodeKey), notFoundIndex, 'No peer');

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await delay(addPeerDelayMs);

  const updatedPeers = (await getPeers({lnd})).peers;

  const connected = updatedPeers.find(n => n.public_key === remoteNodeKey);

  equal(connected.public_key, remoteNodeKey, 'Connected to remote node');

  cluster.kill();

  return end();
});

