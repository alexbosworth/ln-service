const {createHash} = require('node:crypto');
const {equal} = require('node:assert').strict;
const {randomBytes} = require('node:crypto');
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getInvoice} = require('./../../');
const {payViaPaymentDetails} = require('./../../');

const interval = 100;
const keySendPreimageType = '5482373484';
const mtokens = '100000';
const preimageByteLength = 32;
const size = 3;
const times = 1500;
const tokens = 100;

// A confirmed push payment invoice collects a repeat payment of its secret
test(`Pay a confirmed push payment again`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  try {
    // Each payer pays the target over its own channel
    await setupChannel({generate, lnd, to: target});

    await setupChannel({
      generate: remote.generate,
      lnd: remote.lnd,
      to: target,
    });

    const preimage = randomBytes(preimageByteLength);

    const id = createHash('sha256').update(preimage).digest('hex');
    const secret = preimage.toString('hex');

    // Push a payment, which creates a confirmed invoice on the target
    await asyncRetry({interval, times}, async () => {
      return await payViaPaymentDetails({
        id,
        lnd,
        tokens,
        destination: target.id,
        messages: [{type: keySendPreimageType, value: secret}],
      });
    });

    await asyncRetry({interval, times}, async () => {
      const invoice = await getInvoice({id, lnd: target.lnd});

      if (!invoice.is_confirmed) {
        throw new Error('ExpectedInvoiceConfirmed');
      }

      return;
    });

    // LND accepts a repeat push payment even when the invoice is confirmed
    await asyncRetry({interval, times}, async () => {
      return await payViaPaymentDetails({
        id,
        tokens,
        destination: target.id,
        lnd: remote.lnd,
        messages: [{type: keySendPreimageType, value: secret}],
      });
    });

    // The repeat payment is confirmed once it is final
    const invoice = await asyncRetry({interval, times}, async () => {
      const invoice = await getInvoice({id, lnd: target.lnd});

      const confirmed = invoice.payments.filter(n => n.is_confirmed);

      if (confirmed.length !== [lnd, remote.lnd].length) {
        throw new Error('ExpectedRepeatPaymentConfirmed');
      }

      return invoice;
    });

    equal(invoice.confirming, 0, 'Nothing is left confirming');
    equal(invoice.held, 0, 'Nothing is held');
    equal(invoice.is_confirmed, true, 'Invoice stays confirmed');
    equal(invoice.is_push, true, 'Invoice is a push payment');
    equal(invoice.payments.length, [lnd, remote.lnd].length, 'Paid twice');
    equal(invoice.received, tokens + tokens, 'Both payments are received');
    equal(invoice.received_mtokens, '200000', 'Both payments mtokens');

    invoice.payments.forEach(payment => {
      equal(payment.is_canceled, false, 'Payment is not canceled');
      equal(payment.is_confirming, false, 'Payment is final');
      equal(payment.is_secret_revealed, true, 'Payment revealed the secret');
      equal(payment.mtokens, mtokens, 'Payment mtokens');

      return;
    });
  } catch (err) {
    equal(err, null, 'Expected repeat push payment is received');
  }

  await kill({});

  return;
});
