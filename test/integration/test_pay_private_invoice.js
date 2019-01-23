const {randomBytes} = require('crypto');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const decodePaymentRequest = require('./../../decodePaymentRequest');
const {delay} = require('./../macros');
const getChannel = require('./../../getChannel');
const getChannels = require('./../../getChannels');
const getInvoice = require('./../../getInvoice');
const getRoutes = require('./../../getRoutes');
const getWalletInfo = require('./../../getWalletInfo');
const {hopsFromChannels} = require('./../../routing');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultVout = 0;
const mtokPadding = '000';
const reserveRatio = 0.99;
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying an invoice should settle the invoice
test(`Pay`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;
  const remoteLnd = cluster.remote.lnd;

  await delay(3000);

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await delay(3000);

  await cluster.generate({count: confirmationCount, node: cluster.control});

  const [channel] = (await getChannels({lnd})).channels;

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    is_private: true,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await delay(3000);

  await cluster.generate({count: confirmationCount, node: cluster.target});

  const [remoteChannel] = (await getChannels({lnd: remoteLnd})).channels;

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  const invoice = await createInvoice({
    tokens,
    is_including_private_channels: true,
    lnd: cluster.remote.lnd,
  });

  const {id} = invoice;
  const {request} = invoice;

  const decodedRequest = await decodePaymentRequest({lnd, request});

  const {routes} = await getRoutes({
    lnd,
    destination: decodedRequest.destination,
    routes: decodedRequest.routes,
    tokens: invoice.tokens,
  });

  const payment = await pay({lnd, path: {id, routes}});

  const paidInvoice = await getInvoice({id, lnd: cluster.remote.lnd});

  equal(paidInvoice.secret, invoice.secret, 'Paying invoice got secret');
  equal(paidInvoice.is_confirmed, true, 'Private invoice is paid');

  await cluster.kill({});

  return end();
});

