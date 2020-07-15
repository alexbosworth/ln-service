const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {getInvoice} = require('./../../');
const {getInvoices} = require('./../../');
const {payViaPaymentDetails} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToInvoices} = require('./../../');

const interval = retryCount => 50 * Math.pow(2, retryCount);
const keySendPreimageType = '5482373484';
const preimageByteLength = 32;
const times = 10;

// Pay a push payment
test(`Pay push payment`, async ({deepIs, end, equal, rejects}) => {
  const cluster = await (async () => {
    try {
      return await createCluster({
        is_keysend_enabled: true,
        is_remote_skipped: true,
      });
    } catch (err) {}
  })();

  if (!cluster) {
    return end();
  }

  await setupChannel({
    generate: cluster.generate,
    lnd: cluster.control.lnd,
    to: cluster.target,
  });

  const preimage = randomBytes(preimageByteLength);
  let updated;

  const id = createHash('sha256').update(preimage).digest().toString('hex');
  const secret = preimage.toString('hex');

  const sub = subscribeToInvoices({lnd: cluster.target.lnd});

  sub.on('invoice_updated', n => updated = n);

  // Wait for the payment to be made
  await asyncRetry({interval, times}, async () => {
    const payment = await payViaPaymentDetails({
      id,
      destination: cluster.target.public_key,
      lnd: cluster.control.lnd,
      messages: [{type: keySendPreimageType, value: secret}],
      tokens: 100,
    });
  });

  // Wait for the invoice to be emitted
  await asyncRetry({interval, times}, async () => {
    if (!updated) {
      throw new Error('ExpectedInvoiceEmitted');
    }

    if (!updated.is_confirmed) {
      throw new Error('ExpectedInvoiceConfirmed');
    }

    return;
  });

  sub.removeAllListeners();

  equal(updated.secret, secret, 'Got invoice event secret');
  equal(updated.is_push, true, 'Got invoice event push');

  const gotInvoice = await getInvoice({id, lnd: cluster.target.lnd});
  const {invoices} = await getInvoices({lnd: cluster.target.lnd});

  const [invoice] = invoices;

  equal(gotInvoice.secret, secret, 'Get invoice push payment');
  equal(gotInvoice.is_push, true, 'Get invoice shows push payment');

  equal(invoice.secret, secret, 'Get invoices push payment');
  equal(invoice.is_push, true, 'Get invoices shows push payment');

  await cluster.kill({});

  return end();
});
