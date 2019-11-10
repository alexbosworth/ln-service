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
const {getRouteThroughHops} = require('./../../');
const {getRoutes} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {payViaRoutes} = require('./../../');
const {routeFromChannels} = require('./../../routing');
const {setupChannel} = require('./../macros');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const mtokPadding = '000';
const regtestChain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const reserveRatio = 0.99;
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying via routes should successfully pay via routes
test(`Pay via routes`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;
  const remoteLnd = cluster.remote.lnd;
  const targetPubKey = cluster.target_node_public_key;

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

  const {routes} = await getRoutes({
    lnd,
    destination: decodedRequest.destination,
    routes: decodedRequest.routes,
    tokens: invoice.tokens,
  });

  const [route] = routes;

  try {
    const res = await getRouteThroughHops({
      lnd,
      mtokens: (BigInt(invoice.tokens) * BigInt(1e3)).toString(),
      public_keys: route.hops.map(n => n.public_key),
    });

    delete res.route.confidence;
    delete res.route.payment;
    delete res.route.total_mtokens;
    delete route.confidence;
    delete route.payment;
    delete route.total_mtokens;

    deepIs(res.route, route, 'Constructed route to destination');
  } catch (err) {
    deepIs(err, [501, 'ExpectedRouterRpcWithGetRouteMethod'], 'Unimplemented');
  }

  await cluster.kill({});

  return end();
});
