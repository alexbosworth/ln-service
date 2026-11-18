const {createHash} = require('node:crypto');
const {equal} = require('node:assert').strict;
const {randomBytes} = require('node:crypto');
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createHodlInvoice} = require('./../../');
const {getInvoice} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {settleHodlInvoice} = require('./../../');
const {subscribeToInvoice} = require('./../../');

const capacity = 1e6;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const interval = 10;
const mtokens = '100000';
const size = 2;
const times = 1500;
const tlvType = '67890';
const tlvValue = '00';
const tokens = 100;

// Subscribe to a settled invoice should return invoice settled event
test(`Subscribe to settled invoice`, async () => {
  const {kill, nodes} = await spawnLightningCluster({capacity, size});

  const [{lnd}, target] = nodes;

  let currentInvoice;

  const secret = randomBytes(32);

  const sub = subscribeToInvoice({
    id: createHash('sha256').update(secret).digest('hex'),
    lnd: target.lnd,
  });

  const updates = [];

  sub.on('invoice_updated', data => currentInvoice = data);
  sub.on('invoice_updated', data => updates.push(data));

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

    // A held payment is counted as held rather than received
    equal(currentInvoice.held, tokens, 'Invoice holds the payment');
    equal(currentInvoice.held_mtokens, mtokens, 'Invoice holds mtokens');
    equal(currentInvoice.received, 0, 'Held payment is not received');
    equal(currentInvoice.received_mtokens, '0', 'Held mtokens not received');

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

      const messages = payment.messages.filter(n => n.type === tlvType);

      if (!!messages.filter(n => n.type === tlvType).length) {
        const [{type, value}] = messages;

        equal(type, tlvType, 'Payment message TLV type returned');
        equal(value, tlvValue, 'Payment message TLV value returned');
      }

      equal(payment.is_confirming, false, 'Payment is final');
      equal(payment.is_secret_revealed, true, 'Payment revealed the secret');
    }

    equal(!!currentInvoice.is_held, false, 'Invoice is not held yet');
    equal(!!currentInvoice.is_canceled, false, 'Invoice is not canceled yet');
    equal(!!currentInvoice.is_confirmed, true, 'Invoice is confirmed');

    // Once final, the payment is received and nothing is held or pending
    equal(currentInvoice.confirming, 0, 'Nothing is left confirming');
    equal(currentInvoice.held, 0, 'Nothing is held once confirmed');
    equal(currentInvoice.received, tokens, 'Confirmed invoice received');
    equal(currentInvoice.received_mtokens, mtokens, 'Received mtokens');

    // LND 0.21.8 and below confirm at once and do not say a secret is revealed
    if (!!currentInvoice.is_secret_revealed) {
      const confirming = updates.find(n => !!n.is_confirming);

      equal(!!confirming, true, 'Invoice is confirming before confirmed');

      const [paying] = confirming.payments;

      equal(confirming.is_confirmed, false, 'Confirming is not yet confirmed');
      equal(confirming.is_secret_revealed, true, 'Confirming reveals secret');
      equal(paying.is_confirming, true, 'Payment is confirming');
      equal(paying.is_secret_revealed, true, 'Payment secret is revealed');

      // A confirming payment is pending, so it is not counted as received
      equal(confirming.confirming, tokens, 'Confirming tokens are pending');
      equal(confirming.confirming_mtokens, mtokens, 'Confirming mtokens');
      equal(confirming.held, 0, 'Confirming payment is no longer held');
      equal(confirming.received, 0, 'Confirming payment is not received');
      equal(paying.pending_index, 0, 'Confirming payment keeps HTLC index');
    }

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

  return;
});
