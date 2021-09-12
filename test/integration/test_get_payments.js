const asyncTimesSeries = require('async/timesSeries');
const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getPayments} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');

const start = new Date().toISOString();
const tokens = 100;

// Getting payments should return the list of payments
test('Get payments', async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  await setupChannel({lnd, generate: cluster.generate, to: cluster.target});

  const invoice = await createInvoice({tokens, lnd: cluster.target.lnd});

  const paid = await pay({lnd, request: invoice.request});

  const [payment] = (await getPayments({lnd})).payments;

  equal(payment.destination, cluster.target_node_public_key, 'Destination');
  equal(payment.confirmed_at > start, true, 'Got confirmed date');
  equal(payment.created_at.length, 24, 'Created at time');
  equal(payment.fee, 0, 'Fee paid');
  equal(payment.hops.length, 0, 'Hops');
  equal(payment.id, invoice.id, 'Id');
  equal(payment.is_confirmed, true, 'Confirmed');
  equal(payment.is_outgoing, true, 'Outgoing');
  equal(payment.mtokens, (BigInt(tokens) * BigInt(1e3)).toString(), 'Mtoks');
  equal(payment.secret, invoice.secret, 'Payment secret');
  equal(payment.tokens, tokens, 'Paid tokens');

  if (!!payment.request) {
    equal(payment.request, invoice.request, 'Returns original pay request');
  }

  await asyncTimesSeries(4, async () => {
    const {request} = await createInvoice({tokens, lnd: cluster.target.lnd});

    const paid = await pay({lnd, request});
  });

  const page1 = await getPayments({lnd, limit: 2});

  const [firstOfPage1] = page1.payments;

  const page2 = await getPayments({lnd, token: page1.next});

  const [firstOfPage2] = page2.payments;

  equal(firstOfPage2.index, 3, 'Got payment index');

  const page3 = await getPayments({lnd, token: page2.next});

  equal(!!page3.next, false, 'There is no page 4');

  await cluster.kill({});

  return end();
});
