const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {deletePayment} = require('./../../');
const {getPayments} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');

const size = 2;
const tokens = 100;

// Deleting a payment should delete the payment record
test('Delete payment', async ({afterEach, fail, end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {lnd} = control;

  await setupChannel({lnd, generate: control.generate, to: target});

  const invoice = await createInvoice({tokens, lnd: target.lnd});

  let paid;

  try {
    paid = await pay({lnd, request: invoice.request});
  } catch (err) {
    fail('Payment should be made to destination');

    await kill({});

    return end();
  }

  const priorLength = (await getPayments({lnd})).payments.length;

  // LND 0.13.4 and below do not support deletePayment
  try {
    await deletePayment({lnd, id: invoice.id});
  } catch (err) {
    strictSame(err, [501, 'DeletePaymentMethodNotSupported']);

    await kill({});

    return end();
  }

  const wipedLength = (await getPayments({lnd})).payments.length;

  equal(priorLength - wipedLength, [paid].length, 'Payment deleted');

  await kill({});

  return end();
});
