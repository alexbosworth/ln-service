const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {getPeers} = require('./../../');

const interval = retryCount => 50 * Math.pow(2, retryCount);
const times = 10;

// Getting peers should return the list of peers
test('Get peers', async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  await asyncRetry({interval, times}, async () => {
    const [peer] = (await getPeers({lnd})).peers;

    if (!peer || !peer.is_sync_peer) {
      throw new Error('ExpectedSyncPeer');
    }

    equal(peer.bytes_received !== undefined, true, 'Bytes received');
    equal(peer.bytes_sent !== undefined, true, 'Bytes sent');
    equal(peer.is_inbound, false, 'Is inbound peer');
    equal(peer.is_sync_peer, true, 'Is sync peer');
    equal(peer.ping_time, 0, 'Ping time');
    equal(!!peer.public_key, true, 'Public key');
    equal(!!peer.socket, true, 'Socket');
    equal(peer.tokens_received, 0, 'Tokens received');
    equal(peer.tokens_sent, 0, 'Tokens sent');

    return;
  });

  await cluster.kill({});

  return end();
});
