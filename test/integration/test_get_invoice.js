const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {getInvoice} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');

const description = 'description';
const secret = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
const tokens = 42;

// getInvoice results in invoice details
test(`Get an invoice`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true})

  const {lnd} = cluster.control;

  const channel = await setupChannel({
    lnd,
    generate: cluster.generate,
    give: 1e5,
    to: cluster.target,
  });

  const created = await createInvoice({description, lnd, secret, tokens});

  const invoice = await getInvoice({lnd, id: created.id});

  equal(invoice.description, description, 'Invoice description');
  equal(invoice.is_private, false, 'Invoice is public');
  equal(invoice.received, 0, 'Invoice received tokens');
  equal(invoice.received_mtokens, '0', 'Invoice received mtokens');
  equal(invoice.secret, secret, 'Invoice secret');
  equal(invoice.tokens, tokens, 'Invoice tokens');

  await pay({lnd: cluster.target.lnd, request: created.request});

  const paid = await getInvoice({lnd, id: created.id});

  if (!!paid.payments.length) {
    equal(paid.payments.length, [created.request].length, 'Paid only once');

    const [payment] = paid.payments;

    equal(payment.canceled_at, undefined, 'Payment was not canceled');
    equal(!!payment.confirmed_at, true, 'Payment settle date returned');
    equal(!!payment.created_at, true, 'Payment first held date returned');
    equal(!!payment.created_height, true, 'Payment height');
    equal(payment.in_channel, channel.id, 'Payment channel id returned');
    equal(payment.is_canceled, false, 'Payment not canceled');
    equal(payment.is_confirmed, true, 'Payment was settled');
    equal(payment.is_held, false, 'Payment is no longer held');
    equal(payment.mtokens, (BigInt(tokens) * BigInt(1e3)).toString(), 'Mtoks');
    equal(payment.pending_index, undefined, 'Pending index not defined');
    equal(payment.tokens, tokens, 'Payment tokens returned');
  }

  equal(paid.is_confirmed, true, 'Invoice has been paid');

  await cluster.kill({});

  return end();
});
