const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getPayment} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {subscribeToForwards} = require('./../../');
const {subscribeToPayments} = require('./../../');
const {waitForRoute} = require('./../macros');

const unsupported = 'unknown method TrackPayments for service routerrpc.Router';
const size = 2;
const tokens = 100;

// Subscribing to payments should notify on a payment
test(`Subscribe to payments`, async ({end, rejects, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  try {
    const forwards = [];
    const isLegacy = [];
    const isPaying = [];
    const payments = [];

    const invoice = await createInvoice({tokens, lnd: target.lnd});

    const {id} = invoice;

    await setupChannel({generate, lnd, to: target});

    const sub = subscribeToPayments({lnd});
    const sub2 = subscribeToForwards({lnd});

    sub2.on('forward', forward => forwards.push(forward));
    sub.on('confirmed', payment => payments.push(payment));
    sub.on('paying', payment => isPaying.push(payment));

    sub.on('error', error => {
      const [,, {err}] = error;

      // subscribeToPayments is not supported on LND 0.15.5 and below
      if (err.details === unsupported) {
        return isLegacy.push(error);
      }

      return strictSame(error, null, 'Expected no error');
    });

    await payViaPaymentRequest({lnd, request: invoice.request});

    const {payment} = await getPayment({id, lnd});

    await asyncRetry({interval: 10, times: 1000}, async () => {
      if (forwards.length !== 2) {
        throw new Error('ExpectedForwardsEvents');
      }

      return;
    });

    // Exit early when this is a legacy LND
    if (!!isLegacy.length) {
      [sub, sub2].forEach(n => n.removeAllListeners());

      await kill({});

      return end();
    }

    const [got] = payments;

    const sent = forwards.find(n => n.is_confirmed && n.is_send);

    [sub, sub2].forEach(n => n.removeAllListeners());

    strictSame(got, payment, 'Payment subscription notifies of payment');

    const [pending] = isPaying;

    strictSame(pending.created_at, payment.created_at, 'Got date');
    strictSame(pending.destination, payment.destination, 'Got destination');
    strictSame(pending.id, payment.id, 'Got id');
    strictSame(pending.mtokens, payment.mtokens, 'Got mtokens');
    strictSame(pending.paths.length, payment.paths.length, 'Got path');
    strictSame(pending.request, payment.request, 'Got request');
    strictSame(pending.safe_tokens, payment.safe_tokens, 'Got safe tokens');
    strictSame(pending.timeout, payment.timeout, 'Got timeout');
    strictSame(pending.tokens, payment.tokens, 'Got tokens');
  } catch (err) {
    strictSame(err, null, 'Expected no error');
  }

  await kill({});

  return end();
});
