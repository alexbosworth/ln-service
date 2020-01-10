const asyncRetry = require('async/retry');
const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {getPeers} = require('./../../');

const interval = retryCount => 50 * Math.pow(2, retryCount);
const times = 15;

// Adding peers should result in a connected peer
test(`Add a peer`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;
  const remoteNodeKey = cluster.remote_node_public_key;

  const connectedKeys = (await getPeers({lnd})).peers.map(n => n.public_key);

  equal(connectedKeys.find(n => n === remoteNodeKey), undefined, 'No peer');

  await asyncRetry({interval, times}, async () => {
    await addPeer({
      lnd,
      public_key: cluster.remote.public_key,
      socket: cluster.remote.socket,
    });

    const {peers} = await getPeers({lnd});

    const connected = peers.find(n => n.public_key === remoteNodeKey);

    equal(connected.public_key, remoteNodeKey, 'Connected to remote node');
  });

  await cluster.kill({});

  return end();
});
