const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getPayment} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToForwards} = require('./../../');
const {subscribeToPastPayments} = require('./../../');
const {waitForRoute} = require('./../macros');

const size = 2;
const tokens = 100;

// Subscribing to past payments should notify on a payment
test(`Subscribe to past payment`, async ({end, rejects, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  try {
    const [{generate, lnd}, target] = nodes;

    const forwards = [];
    const payments = [];

    const invoice = await createInvoice({tokens, lnd: target.lnd});

    const {id} = invoice;

    await setupChannel({generate, lnd, to: target});

    const sub = subscribeToPastPayments({lnd});
    const sub2 = subscribeToForwards({lnd});

    sub2.on('forward', forward => forwards.push(forward));
    sub.on('payment', payment => payments.push(payment));

    await payViaPaymentRequest({lnd, request: invoice.request});

    const {payment} = await getPayment({id, lnd});

    await asyncRetry({interval: 10, times: 1000}, async () => {
      if (forwards.length !== 2) {
        throw new Error('ExpectedForwardsEvents');
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
  } catch (err) {
    strictSame(err, null, 'Expected no error');
  }

  await kill({});

  return end();
});
