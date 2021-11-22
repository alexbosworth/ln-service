const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {getInvoice} = require('./../../');
const {getInvoices} = require('./../../');
const {payViaPaymentDetails} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToInvoices} = require('./../../');

const interval = 10
const keySendPreimageType = '5482373484';
const preimageByteLength = 32;
const size = 2;
const times = 1000;
const tokens = 100;

// Pay a push payment
test(`Pay push payment`, async ({end, equal, rejects}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  try {
    const [{generate, lnd}, target] = nodes;

    await generate({count: 400});

    await setupChannel({generate, lnd, to: target});

    const preimage = randomBytes(preimageByteLength);
    let updated;

    const id = createHash('sha256').update(preimage).digest().toString('hex');
    const secret = preimage.toString('hex');

    const sub = subscribeToInvoices({lnd: target.lnd, restart_delay_ms: 1});

    sub.on('invoice_updated', n => updated = n);

    // Wait for the payment to be made
    await asyncRetry({interval, times}, async () => {
      await addPeer({lnd, public_key: target.id, socket: target.socket});

      const payment = await payViaPaymentDetails({
        id,
        lnd,
        tokens,
        destination: target.id,
        messages: [{type: keySendPreimageType, value: secret}],
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

    const gotInvoice = await getInvoice({id, lnd: target.lnd});
    const {invoices} = await getInvoices({lnd: target.lnd});

    const [invoice] = invoices;

    equal(gotInvoice.secret, secret, 'Get invoice push payment');
    equal(gotInvoice.is_push, true, 'Get invoice shows push payment');

    equal(invoice.secret, secret, 'Get invoices push payment');
    equal(invoice.is_push, true, 'Get invoices shows push payment');
  } catch (err) {
    equal(err, null, 'Expected push payment sent');
  }

  await kill({});

  return end();
});
