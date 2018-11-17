const {test} = require('tap');

const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const {delay} = require('./../macros');
const getPayments = require('./../../getPayments');
const getPeers = require('./../../getPeers');
const getWalletInfo = require('./../../getWalletInfo');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const mtokPadding = '000';
const tokens = 100;

// Getting peers should return the list of peers
test('Get peers', async ({end, equal}) => {
  const cluster = await createCluster({});

  const bSocket = `${cluster.target.listen_ip}:${cluster.target.listen_port}`;
  const {lnd} = cluster.control;

  const [peer] = (await getPeers({lnd})).peers;

  equal(!!peer.bytes_received, true, 'Bytes received');
  equal(!!peer.bytes_sent, true, 'Bytes sent');
  equal(peer.is_inbound, false, 'Is inbound peer');
  equal(peer.ping_time, 0, 'Ping time');
  equal(peer.public_key, cluster.target_node_public_key, 'Public key');
  equal(peer.socket, bSocket, 'Socket');
  equal(peer.tokens_received, 0, 'Tokens received');
  equal(peer.tokens_sent, 0, 'Tokens sent');
  equal(peer.type, 'peer', 'Row type');

  await cluster.kill({});

  return end();
});

