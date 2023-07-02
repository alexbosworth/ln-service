const {createHash} = require('node:crypto');
const {equal} = require('node:assert').strict;
const {randomBytes} = require('node:crypto');
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {cancelHodlInvoice} = require('./../../');
const {createHodlInvoice} = require('./../../');
const {getInvoice} = require('./../../');
const {pay} = require('./../../');
const {subscribeToInvoice} = require('./../../');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const size = 2;
const tokens = 100;

// Subscribe to canceled invoice should return invoice canceled event
test(`Subscribe to canceled invoice`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  let currentInvoice;
  const secret = randomBytes(32);

  const channel = await setupChannel({generate, lnd, to: target});

  const sub = subscribeToInvoice({
    id: createHash('sha256').update(secret).digest('hex'),
    lnd: target.lnd,
  });

  sub.on('invoice_updated', data => currentInvoice = data);

  const invoice = await createHodlInvoice({
    tokens,
    id: createHash('sha256').update(secret).digest('hex'),
    lnd: target.lnd,
  });

  await delay(1000);

  equal(!!currentInvoice.is_held, false, 'Invoice is not held yet');
  equal(!!currentInvoice.is_canceled, false, 'Invoice is not canceled');
  equal(!!currentInvoice.is_confirmed, false, 'Invoice is not confirmed yet');

  setTimeout(async () => {
    if (!!currentInvoice.payments.length) {
      equal(currentInvoice.payments.length, [invoice].length, 'Invoice paid');

      const [payment] = currentInvoice.payments;

      equal(payment.canceled_at, undefined, 'Payment not canceled');
      equal(payment.confirmed_at, undefined, 'Payment not confirmed');
      equal(!!payment.created_at, true, 'Payment held at time');
      equal(!!payment.created_height, true, 'Payment creation height');
      equal(payment.in_channel, channel.id, 'Payment in channel');
      equal(payment.is_canceled, false, 'Payment not canceled');
      equal(payment.is_confirmed, false, 'Payment not confirmed');
      equal(payment.is_held, true, 'Payment is held');
      equal(payment.mtokens, '100000', 'Payment holding mtokens');
      equal(payment.pending_index, 0, 'Payment HTLC index returned');
      equal(payment.tokens, 100, 'Payment tokens held');
    }

    equal(!!currentInvoice.is_held, true, 'Invoice is not held yet');
    equal(!!currentInvoice.is_canceled, false, 'Invoice is not canceled yet');
    equal(!!currentInvoice.is_confirmed, false, 'Invoice is confirmed');

    await cancelHodlInvoice({
      id: createHash('sha256').update(secret).digest('hex'),
      lnd: target.lnd,
    });

    await delay(1000);

    if (!!currentInvoice.payments.length) {
      equal(currentInvoice.payments.length, [invoice].length, 'Invoice paid');

      const [payment] = currentInvoice.payments;

      equal(!!payment.canceled_at, true, 'Payment canceled');
      equal(payment.confirmed_at, undefined, 'Payment not confirmed');
      equal(!!payment.created_at, true, 'Payment held at time');
      equal(!!payment.created_height, true, 'Payment creation height');
      equal(payment.in_channel, channel.id, 'Payment in channel');
      equal(payment.is_canceled, true, 'Payment canceled');
      equal(payment.is_confirmed, false, 'Payment not confirmed');
      equal(payment.is_held, false, 'Payment is not held');
      equal(payment.mtokens, '100000', 'Payment holding mtokens');
      equal(payment.pending_index, undefined, 'Payment HTLC is gone');
      equal(payment.tokens, 100, 'Payment tokens held');
    }

    equal(!!currentInvoice.is_held, false, 'Invoice is not held yet');
    equal(!!currentInvoice.is_canceled, true, 'Invoice is canceled');
    equal(!!currentInvoice.is_confirmed, false, 'Invoice is not confirmed');

    return setTimeout(async () => {
      await kill({});
    },
    2000);
  },
  2000);

  let payErr = [];

  try {
    await pay({lnd, request: invoice.request});
  } catch (err) {
    payErr = err;
  }

  const [errCode, errMsg] = payErr;

  equal(errCode, 503, 'Expected error code for canceled invoice');
  equal(errMsg, 'PaymentRejectedByDestination', 'Expected rejected message');

  await delay(5000);

  return;
});
