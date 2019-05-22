const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const getPeers = require('./../../getPeers');

// Adding peers should result in a connected peer
test(`Add a peer`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;
  const remoteNodeKey = cluster.remote_node_public_key;

  const connectedKeys = (await getPeers({lnd})).peers.map(n => n.public_key);

  equal(connectedKeys.find(n => n === remoteNodeKey), undefined, 'No peer');

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  const {peers} = await getPeers({lnd});

  const connected = peers.find(n => n.public_key === remoteNodeKey);

  equal(connected.public_key, remoteNodeKey, 'Connected to remote node');

  await cluster.kill({});

  return end();
});
