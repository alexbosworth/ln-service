const {randomBytes} = require('crypto');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {cancelHodlInvoice} = require('./../../');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getChannel} = require('./../../');
const {getInvoice} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {openChannel} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {pay} = require('./../../');
const {removePeer} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const interval = 10;
const mtokPadding = '000';
const reserveRatio = 0.99;
const size = 3;
const times = 1000;
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying a private invoice should settle the invoice
test(`Pay private invoice`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  try {
    const [{generate, lnd}, target, remote] = nodes;

    await generate({count: 400});

    const channel = await setupChannel({generate, lnd, to: target});

    const remoteChannel = await setupChannel({
      capacity: channelCapacityTokens,
      generate: target.generate,
      hidden: true,
      lnd: target.lnd,
      to: remote,
    });

    const invoice = await asyncRetry({interval, times}, async () => {
      const invoice = await createInvoice({
        tokens,
        is_including_private_channels: true,
        lnd: remote.lnd,
      });

      const {routes} = parsePaymentRequest({request: invoice.request});

      // Wait for private routes to get picked up
      if (!routes) {
        await cancelHodlInvoice({id: invoice.id, lnd: remote.lnd});

        throw new Error('ExpectedRouteForInvoice');
      }

      return invoice;
    });

    const {id} = invoice;
    const {request} = invoice;

    const decodedRequest = await decodePaymentRequest({lnd, request});

    const route = await asyncRetry({interval: 10, times: 1000}, async () => {
      const {route} = await getRouteToDestination({
        lnd,
        destination: decodedRequest.destination,
        payment: invoice.payment,
        routes: decodedRequest.routes,
        tokens: invoice.tokens,
        total_mtokens: !!invoice.payment ? invoice.mtokens : undefined,
      });

      if (!route) {
        throw new Error('ExpectedRouteToDestination');
      }

      return route;
    });

    const payment = await pay({lnd, path: {id, routes: [route]}});

    const paidInvoice = await getInvoice({id, lnd: remote.lnd});

    equal(paidInvoice.secret, invoice.secret, 'Paying invoice got secret');
    equal(paidInvoice.is_confirmed, true, 'Private invoice is paid');
  } catch (err) {
    equal(err, null, 'Expected no error paying invoice');
  }

  await kill({});

  return end();
});
