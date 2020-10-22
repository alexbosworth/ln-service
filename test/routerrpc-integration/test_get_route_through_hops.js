const {randomBytes} = require('crypto');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getInvoice} = require('./../../');
const {getRouteThroughHops} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {getWalletVersion} = require('./../../');
const {payViaRoutes} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const confirmationCount = 6;
const tokens = 100;

// Getting a route through hops should result in a route through specified hops
test(`Get route through hops`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const controlToTargetChan = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  const targetToRemoteChan = await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
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

  await waitForRoute({
    lnd,
    destination: decodedRequest.destination,
    tokens: invoice.tokens,
  });

  const {route} = await getRouteToDestination({
    lnd,
    cltv_delta: decodedRequest.cltv_delta,
    destination: decodedRequest.destination,
    routes: decodedRequest.routes,
    tokens: invoice.tokens,
  });

  const res = await getRouteThroughHops({
    lnd,
    cltv_delta: decodedRequest.cltv_delta + 6,
    messages: [{type: '1000000', value: '01'}],
    mtokens: (BigInt(invoice.tokens) * BigInt(1e3)).toString(),
    payment: decodedRequest.payment,
    public_keys: route.hops.map(n => n.public_key),
    total_mtokens: invoice.mtokens,
  });

  await payViaRoutes({lnd, id: invoice.id, routes: [res.route]});

  const got = await getInvoice({lnd: cluster.remote.lnd, id: invoice.id});

  delete res.route.confidence;
  delete route.confidence;

  route.messages = [{type: '1000000', value: '01'}];
  route.payment = decodedRequest.payment;
  route.total_mtokens = decodedRequest.mtokens;

  deepIs(res.route, route, 'Constructed route to destination');

  const {payments} = got;

  const [payment] = payments;

  equal(payment.total_mtokens, invoice.mtokens, 'Got MPP total mtokens');

  deepIs(payment.messages, route.messages, 'Remote got TLV messages');

  await cluster.kill({});

  return end();
});
