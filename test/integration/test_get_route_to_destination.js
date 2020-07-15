const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getInvoice} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {payViaRoutes} = require('./../../');
const {setupChannel} = require('./../macros');

const all = promise => Promise.all(promise);
const interval = retryCount => 50 * Math.pow(2, retryCount);
const {isArray} = Array;
const message = {type: '85805', value: '01'};
const times = 15;
const tokens = 100;

// Getting a route to a destination should return a route to the destination
test(`Get a route to a destination`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  {
    const {lnd} = cluster.target;

    const {request} = await createInvoice({lnd});

    // Exit test early if features are not supported
    if (!(await decodePaymentRequest({lnd, request})).features.length) {
      await cluster.kill({});

      return end();
    }
  }

  await setupChannel({
    generate: cluster.generate,
    lnd: cluster.control.lnd,
    to: cluster.target,
  });

  await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    give: 1e5,
    hidden: true,
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  const invoice = await createInvoice({
    tokens,
    is_including_private_channels: true,
    lnd: cluster.remote.lnd,
  });

  const parsed = parsePaymentRequest({request: invoice.request});

  await asyncRetry({interval, times}, async () => {
    const {route} = await getRouteToDestination({
      destination: parsed.destination,
      features: parsed.features,
      lnd: cluster.control.lnd,
      payment: parsed.payment,
      routes: parsed.routes,
      mtokens: parsed.mtokens,
      total_mtokens: parsed.mtokens,
    });

    const paid = await payViaRoutes({
      id: parsed.id,
      lnd: cluster.control.lnd,
      routes: [route],
    });

    equal(invoice.secret, paid.secret, 'Paid multi-hop private route');
  });

  const inv = await createInvoice({tokens, lnd: cluster.target.lnd});

  const invDetails = await decodePaymentRequest({
    lnd: cluster.control.lnd,
    request: inv.request,
  });

  const controlToTarget = await getRouteToDestination({
    destination: cluster.target.public_key,
    features: invDetails.features,
    lnd: cluster.control.lnd,
    messages: [message],
    payment: invDetails.payment,
    tokens: invDetails.tokens / [cluster.control, cluster.remote].length,
    total_mtokens: invDetails.mtokens,
  });

  const remoteToTarget = await getRouteToDestination({
    destination: cluster.target.public_key,
    features: invDetails.features,
    lnd: cluster.remote.lnd,
    messages: [message],
    payment: invDetails.payment,
    tokens: invDetails.tokens / [cluster.control, cluster.remote].length,
    total_mtokens: invDetails.mtokens,
  });

  try {
    const [controlPay, remotePay] = await all([
      payViaRoutes({
        id: invDetails.id,
        lnd: cluster.control.lnd,
        routes: [controlToTarget.route],
      }),
      payViaRoutes({
        id: invDetails.id,
        lnd: cluster.remote.lnd,
        routes: [remoteToTarget.route],
      }),
    ]);

    equal(controlPay.secret, inv.secret, 'Control paid for secret');
    equal(remotePay.secret, inv.secret, 'Remote paid for secret');

    const {payments} = await getInvoice({
      id: invDetails.id,
      lnd: cluster.target.lnd,
    });

    const [payment1, payment2] = payments;

    const [message1] = payment1.messages;
    const [message2] = payment2.messages;

    deepIs(message1, message, 'Target received message');
    deepIs(message2, message, 'Target received both messages');
  } catch (err) {
    equal(err, null, 'Unexpected error paying invoice');
  }

  await cluster.kill({});

  return end();
});
