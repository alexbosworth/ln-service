const {once} = require('events');

const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {removePeer} = require('./../../');
const {subscribeToPeers} = require('./../../');

const all = promise => Promise.all(promise);

// Subscribing to peer events should trigger reception of peer status changes
test(`Subscribe to peers`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const sub = subscribeToPeers({lnd});

  sub.on('error', () => {});

  await addPeer({
    lnd,
    public_key: cluster.target.public_key,
    socket: cluster.target.socket,
  });

  const disconnect = removePeer({lnd, public_key: cluster.target.public_key});
  const receiveDisconnect = once(sub, 'disconnected');

  const [disconectMessage] = await all([receiveDisconnect, disconnect]);

  const [disconnected] = disconectMessage;

  equal(disconnected.public_key, cluster.target.public_key, 'Got d/c event');

  const connect = addPeer({
    lnd,
    public_key: cluster.target.public_key,
    socket: cluster.target.socket,
  });
  const receiveConnectMessage = once(sub, 'connected');

  const [connectMessage] = await all([receiveConnectMessage, connect]);

  const [connected] = connectMessage;

  equal(connected.public_key, cluster.target.public_key, 'Got connected');

  await cluster.kill({});

  return end();
});
