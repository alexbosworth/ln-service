const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {getPeers} = require('./../../');

const interval = 100;
const size = 2;
const times = 4000;
const timeout = 100;

// Adding peers should result in a connected peer
test(`Add a peer`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  try {
    const connectedKeys = (await getPeers({lnd})).peers.map(n => n.public_key);

    strictEqual(
      connectedKeys.find(n => n === target.id),
      undefined,
      'No peer'
    );

    await asyncRetry({interval, times}, async () => {
      await generate({});

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

      strictEqual(connected.public_key, target.id, 'Connected to remote node');
    });
  } catch (err) {
    strictEqual(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return;
});
