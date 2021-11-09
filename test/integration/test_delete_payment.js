const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deletePayment} = require('./../../');
const {getPayments} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');

const tokens = 100;

// Deleting a payment should delete the payment record
test('Delete payment', async ({afterEach, fail, end, equal, strictSame}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  await setupChannel({lnd, generate: cluster.generate, to: cluster.target});

  const invoice = await createInvoice({tokens, lnd: cluster.target.lnd});

  let paid;

  try {
    paid = await pay({lnd, request: invoice.request});
  } catch (err) {
    fail('Payment should be made to destination');

    await cluster.kill({});

    return end();
  }

  const priorLength = (await getPayments({lnd})).payments.length;

  // LND 0.13.4 and below do not support deletePayment
  try {
    await deletePayment({lnd, id: invoice.id});
  } catch (err) {
    strictSame(err, [501, 'DeletePaymentMethodNotSupported']);

    await cluster.kill({});

    return end();
  }

  const wipedLength = (await getPayments({lnd})).payments.length;

  equal(priorLength - wipedLength, [paid].length, 'Payment deleted');

  await cluster.kill({});

  return end();
});
