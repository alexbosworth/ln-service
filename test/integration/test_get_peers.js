const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {getPeers} = require('./../../');

const interval = 10
const size = 2;
const times = 2000;

// Getting peers should return the list of peers
test('Get peers', async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  try {
    await asyncRetry({interval, times}, async () => {
      await generate({});

      await addPeer({
        lnd,
        public_key: target.id,
        retry_count: 1,
        retry_delay: 1,
        socket: target.socket,
        timeout: 100,
      });

      const [peer] = (await getPeers({lnd})).peers;

      if (!peer || !peer.is_sync_peer) {
        throw new Error('ExpectedSyncPeer');
      }

      strictEqual(peer.bytes_received !== undefined, true, 'Bytes received');
      strictEqual(peer.bytes_sent !== undefined, true, 'Bytes sent');
      strictEqual(peer.is_inbound, false, 'Is inbound peer');
      strictEqual(peer.is_sync_peer, true, 'Is sync peer');
      strictEqual(peer.ping_time, 0, 'Ping time');
      strictEqual(peer.public_key, target.id, 'Public key');
      strictEqual(!!peer.socket, true, 'Socket');
      strictEqual(peer.tokens_received, 0, 'Tokens received');
      strictEqual(peer.tokens_sent, 0, 'Tokens sent');

      return;
    });
  } catch (err) {
    strictEqual(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
