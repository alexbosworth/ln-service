const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createHodlInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getInvoice} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {settleHodlInvoice} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToInvoice} = require('./../../');

const interval = 10;
const size = 2;
const times = 1500;
const tlvType = '67890';
const tlvValue = '00';
const tokens = 100;

// Subscribe to a settled invoice should return invoice settled event
test(`Subscribe to settled invoice`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  let currentInvoice;

  await setupChannel({generate, lnd, to: target});

  const secret = randomBytes(32);

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
    // Wait for the invoice to be held
    await asyncRetry({interval, times}, async () => {
      if (!currentInvoice.is_held) {
        throw new Error('ExpectedInvoiceHeld');
      }

      return;
    });

    equal(!!currentInvoice.is_held, true, 'Invoice is not held yet');
    equal(!!currentInvoice.is_canceled, false, 'Invoice is not canceled yet');
    equal(!!currentInvoice.is_confirmed, false, 'Invoice is confirmed');

    await settleHodlInvoice({
      lnd: target.lnd,
      secret: secret.toString('hex'),
    });

    // Wait for the invoice to be confirmed
    await asyncRetry({interval, times}, async () => {
      if (!currentInvoice.is_confirmed) {
        throw new Error('ExpectedInvoiceConfirmed');
      }

      return;
    });

    const {payments} = currentInvoice;

    if (!!payments.length) {
      const [payment] = payments;

      if (!!payment.messages.length) {
        const [{type, value}] = payment.messages;

        equal(type, tlvType, 'Payment message TLV type returned');
        equal(value, tlvValue, 'Payment message TLV value returned');
      }
    }

    equal(!!currentInvoice.is_held, false, 'Invoice is not held yet');
    equal(!!currentInvoice.is_canceled, false, 'Invoice is not canceled yet');
    equal(!!currentInvoice.is_confirmed, true, 'Invoice is confirmed');

    currentInvoice = 'finished';

    await kill({});
  },
  1000);

  const paid = await payViaPaymentRequest({
    lnd,
    messages: [{type: tlvType, value: tlvValue}],
    request: invoice.request,
  });

  equal(paid.secret, secret.toString('hex'), 'Paying reveals the HTLC secret');

  await asyncRetry({interval, times}, async () => {
    if (currentInvoice !== 'finished') {
      throw new Error('WaitingForSettlement');
    }
  });

  return end();
});
