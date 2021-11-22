const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {cancelHodlInvoice} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {delay} = require('./../macros');
const {getInvoice} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {payViaRoutes} = require('./../../');
const {setupChannel} = require('./../macros');

const all = promise => Promise.all(promise);
const interval = 10;
const {isArray} = Array;
const message = {type: '85805', value: '01'};
const size = 3;
const times = 3000;
const tokens = 1000;

// Getting a route to a destination should return a route to the destination
test(`Get a route to a destination`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target, remote] = nodes;

  await control.generate({count: 500});

  await setupChannel({
    generate: control.generate,
    lnd: control.lnd,
    to: target,
  });

  await setupChannel({
    generate: target.generate,
    give: 1e5,
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

  const parsed = parsePaymentRequest({request: invoice.request});

  await asyncRetry({interval, times}, async () => {
    const {route} = await getRouteToDestination({
      destination: parsed.destination,
      features: parsed.features,
      lnd: control.lnd,
      payment: parsed.payment,
      routes: parsed.routes,
      mtokens: parsed.mtokens,
      total_mtokens: parsed.mtokens,
    });

    const paid = await payViaRoutes({
      id: parsed.id,
      lnd: control.lnd,
      routes: [route],
    });

    equal(invoice.secret, paid.secret, 'Paid multi-hop private route');
  });

  const inv = await createInvoice({tokens, lnd: target.lnd});

  const invDetails = await decodePaymentRequest({
    lnd: control.lnd,
    request: inv.request,
  });

  const controlToTarget = await getRouteToDestination({
    destination: target.id,
    features: invDetails.features,
    lnd: control.lnd,
    messages: [message],
    payment: invDetails.payment,
    tokens: invDetails.tokens / [control, remote].length,
    total_mtokens: invDetails.mtokens,
  });

  const remoteToTarget = await getRouteToDestination({
    destination: target.id,
    features: invDetails.features,
    lnd: remote.lnd,
    messages: [message],
    payment: invDetails.payment,
    tokens: invDetails.tokens / [control, remote].length,
    total_mtokens: invDetails.mtokens,
  });

  try {
    const [controlPay, remotePay] = await all([
      payViaRoutes({
        id: invDetails.id,
        lnd: control.lnd,
        routes: [controlToTarget.route],
      }),
      payViaRoutes({
        id: invDetails.id,
        lnd: remote.lnd,
        routes: [remoteToTarget.route],
      }),
    ]);

    equal(controlPay.secret, inv.secret, 'Control paid for secret');
    equal(remotePay.secret, inv.secret, 'Remote paid for secret');

    const {payments} = await getInvoice({
      id: invDetails.id,
      lnd: target.lnd,
    });

    const [payment1, payment2] = payments;

    const [message1] = payment1.messages;
    const [message2] = payment2.messages;

    strictSame(message1, message, 'Target received message');
    strictSame(message2, message, 'Target received both messages');
  } catch (err) {
    equal(err, null, 'Unexpected error paying invoice');
  }

  await kill({});

  return end();
});
