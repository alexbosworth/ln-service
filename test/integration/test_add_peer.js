const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {getPeers} = require('./../../');

const interval = 100;
const size = 2;
const times = 2000;
const timeout = 100;

// Adding peers should result in a connected peer
test(`Add a peer`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{lnd}, target] = nodes;

  try {
    const connectedKeys = (await getPeers({lnd})).peers.map(n => n.public_key);

    equal(connectedKeys.find(n => n === target.id), undefined, 'No peer');

    await asyncRetry({interval, times}, async () => {
      await addPeer({
        lnd,
        timeout,
        public_key: target.id,
        retry_count: 1,
        retry_delay: 1,
        socket: target.socket,
      });

      const {peers} = await getPeers({lnd});

      const connected = peers.find(n => n.public_key === target.id);

      if (!connected) {
        throw new Error('ExpectedConnectionToTarget');
      }

      equal(connected.public_key, target.id, 'Connected to remote node');
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return end();
});
