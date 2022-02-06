const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {getPeers} = require('./../../');

const interval = 10
const size = 2;
const times = 1000;

// Getting peers should return the list of peers
test('Get peers', async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{lnd}, target] = nodes;

  try {
    await asyncRetry({interval, times}, async () => {
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

      equal(peer.bytes_received !== undefined, true, 'Bytes received');
      equal(peer.bytes_sent !== undefined, true, 'Bytes sent');
      equal(peer.is_inbound, false, 'Is inbound peer');
      equal(peer.is_sync_peer, true, 'Is sync peer');
      equal(peer.ping_time, 0, 'Ping time');
      equal(peer.public_key, target.id, 'Public key');
      equal(!!peer.socket, true, 'Socket');
      equal(peer.tokens_received, 0, 'Tokens received');
      equal(peer.tokens_sent, 0, 'Tokens sent');

      return;
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return end();
});
