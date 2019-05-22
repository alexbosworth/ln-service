const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const getPeers = require('./../../getPeers');

// Getting peers should return the list of peers
test('Get peers', async ({end, equal}) => {
  const cluster = await createCluster({});

  const bSocket = `${cluster.target.listen_ip}:${cluster.target.listen_port}`;
  const {lnd} = cluster.control;

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  const [peer] = (await getPeers({lnd})).peers;

  equal(peer.bytes_received !== undefined, true, 'Bytes received');
  equal(peer.bytes_sent !== undefined, true, 'Bytes sent');
  equal(peer.is_inbound, false, 'Is inbound peer');
  equal(peer.is_sync_peer, true, 'Is sync peer');
  equal(peer.ping_time, 0, 'Ping time');
  equal(!!peer.public_key, true, 'Public key');
  equal(!!peer.socket, true, 'Socket');
  equal(peer.tokens_received, 0, 'Tokens received');
  equal(peer.tokens_sent, 0, 'Tokens sent');
  equal(peer.type, 'peer', 'Row type');

  await cluster.kill({});

  return end();
});
