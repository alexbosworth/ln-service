const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const {test} = require('tap');

const {cancelHodlInvoice} = require('./../../');
const {createCluster} = require('./../macros');
const {createHodlInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getInvoice} = require('./../../');
const {getInvoices} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {subscribeToInvoice} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const tokens = 100;

// Subscribe to canceled invoice should return invoice canceled event
test(`Subscribe to canceled invoice`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});
  let currentInvoice;

  const {lnd} = cluster.control;

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target.public_key,
    socket: cluster.target.socket,
  });

  await waitForPendingChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  await waitForChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  const secret = randomBytes(32);

  const sub = subscribeToInvoice({
    id: createHash('sha256').update(secret).digest('hex'),
    lnd: cluster.target.lnd,
  });

  sub.on('invoice_updated', data => currentInvoice = data);

  const invoice = await createHodlInvoice({
    tokens,
    id: createHash('sha256').update(secret).digest('hex'),
    lnd: cluster.target.lnd,
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
      equal(payment.in_channel, '443x1x0', 'Payment in channel');
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
      lnd: cluster.target.lnd,
    });

    await delay(1000);

    if (!!currentInvoice.payments.length) {
      equal(currentInvoice.payments.length, [invoice].length, 'Invoice paid');

      const [payment] = currentInvoice.payments;

      equal(!!payment.canceled_at, true, 'Payment canceled');
      equal(payment.confirmed_at, undefined, 'Payment not confirmed');
      equal(!!payment.created_at, true, 'Payment held at time');
      equal(!!payment.created_height, true, 'Payment creation height');
      equal(payment.in_channel, '443x1x0', 'Payment in channel');
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
      await cluster.kill({});
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

  equal(errCode, 404, 'Expected error code for canceled invoice');
  equal(errMsg, 'UnknownPaymentHash', 'Expected error message for invoice');

  await delay(5000);

  return end();
});
