const {randomBytes} = require('crypto');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getInvoice} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const mtokPadding = '000';
const reserveRatio = 0.99;
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying a private invoice should settle the invoice
test(`Pay private invoice`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;
  const remoteLnd = cluster.remote.lnd;

  await addPeer({
    lnd,
    public_key: cluster.target.public_key,
    socket: cluster.target.socket,
  });

  const channel = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  await addPeer({
    lnd: cluster.target.lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  const remoteChannel = await setupChannel({
    capacity: channelCapacityTokens,
    generate: cluster.generate,
    generator: cluster.target,
    hidden: true,
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });


  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
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

  const {route} = await getRouteToDestination({
    lnd,
    destination: decodedRequest.destination,
    payment: invoice.payment,
    routes: decodedRequest.routes,
    tokens: invoice.tokens,
    total_mtokens: !!invoice.payment ? invoice.mtokens : undefined,
  });

  const payment = await pay({lnd, path: {id, routes: [route]}});

  const paidInvoice = await getInvoice({id, lnd: cluster.remote.lnd});

  equal(paidInvoice.secret, invoice.secret, 'Paying invoice got secret');
  equal(paidInvoice.is_confirmed, true, 'Private invoice is paid');

  await cluster.kill({});

  return end();
});
