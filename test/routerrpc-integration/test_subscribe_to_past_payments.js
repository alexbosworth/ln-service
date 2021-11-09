const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getPayment} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToForwards} = require('./../../');
const {subscribeToPastPayments} = require('./../../');
const {waitForRoute} = require('./../macros');

const tokens = 100;

// Subscribing to past payments should notify on a payment
test(`Subscribe to past payment`, async ({end, rejects, strictSame}) => {
  const cluster = await createCluster({is_remote_skipped: true});
  const forwards = [];
  const payments = [];

  const invoice = await createInvoice({tokens, lnd: cluster.target.lnd});
  const {lnd} = cluster.control;

  const {id} = invoice;

  await setupChannel({lnd, generate: cluster.generate, to: cluster.target});

  const sub = subscribeToPastPayments({lnd});
  const sub2 = subscribeToForwards({lnd});

  sub2.on('forward', forward => forwards.push(forward));
  sub.on('payment', payment => payments.push(payment));

  await payViaPaymentRequest({lnd, request: invoice.request});

  const {payment} = await getPayment({id, lnd});

  await asyncRetry({}, async () => {
    if (forwards.length !== 2) {
      throw new Error('ExpectedForwardsEvents');
      return;
    }

    return;
  });

  const [got] = payments;

  const sent = forwards.find(n => n.is_confirmed && n.is_send);

  [sub, sub2].forEach(n => n.removeAllListeners());

  // LND 0.13.4 and below do not support preimages in forward notifications
  if (!!sent && !!sent.secret) {
    strictSame(got, payment, 'Payment subscription notifies of payment');
  }

  await cluster.kill({});

  return end();
});
