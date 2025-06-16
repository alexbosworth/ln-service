const {equal} = require('node:assert').strict;
const {once} = require('node:events');
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {removePeer} = require('./../../');
const {subscribeToPeers} = require('./../../');

const all = promise => Promise.all(promise);
const interval = 10;
const size = 2;
const times = 1000;

// Subscribing to peer events should trigger reception of peer status changes
test(`Subscribe to peers`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  try {
    const sub = subscribeToPeers({lnd});

    sub.on('error', () => {});

    await asyncRetry({interval, times}, async () => {
      await generate({});

      await addPeer({lnd, public_key: target.id, socket: target.socket});
    });

    const disconnect = removePeer({lnd, public_key: target.id});
    const receiveDisconnect = once(sub, 'disconnected');

    const [disconectMessage] = await all([receiveDisconnect, disconnect]);

    const [disconnected] = disconectMessage;

    equal(disconnected.public_key, target.id, 'Got d/c event');

    const connect = asyncRetry({interval, times}, async () => {
      return addPeer({lnd, public_key: target.id, socket: target.socket});
    });

    const receiveConnectMessage = once(sub, 'connected');

    const [connectMessage] = await all([receiveConnectMessage, connect]);

    const [connected] = connectMessage;

    equal(connected.public_key, target.id, 'Got connected');
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
