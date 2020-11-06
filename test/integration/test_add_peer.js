const asyncRetry = require('async/retry');
const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {getPeers} = require('./../../');

const interval = 100;
const times = 100;

// Adding peers should result in a connected peer
test(`Add a peer`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;
  const remoteNodeKey = cluster.remote.public_key;

  const connectedKeys = (await getPeers({lnd})).peers.map(n => n.public_key);

  equal(connectedKeys.find(n => n === remoteNodeKey), undefined, 'No peer');

  await asyncRetry({interval, times}, async () => {
    await addPeer({
      lnd,
      public_key: cluster.remote.public_key,
      socket: cluster.remote.socket,
      timeout: 1,
    });

    const {peers} = await getPeers({lnd});

    const connected = peers.find(n => n.public_key === remoteNodeKey);

    equal(connected.public_key, remoteNodeKey, 'Connected to remote node');
  });

  (async () => {
    await cluster.kill({});
  })();

  return end();
});
