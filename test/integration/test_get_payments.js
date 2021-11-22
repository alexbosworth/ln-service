const asyncTimesSeries = require('async/timesSeries');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {getPayments} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');

const start = new Date().toISOString();
const size = 2;
const tokens = 100;

// Getting payments should return the list of payments
test('Get payments', async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await setupChannel({generate, lnd, to: target});

  const invoice = await createInvoice({tokens, lnd: target.lnd});

  const paid = await pay({lnd, request: invoice.request});

  const [payment] = (await getPayments({lnd})).payments;

  equal(payment.destination, target.id, 'Destination');
  equal(payment.confirmed_at > start, true, 'Got confirmed date');
  equal(payment.created_at.length, 24, 'Created at time');
  equal(payment.fee, 0, 'Fee paid');
  equal(payment.hops.length, [].length, 'Hops');
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
    const {request} = await createInvoice({tokens, lnd: target.lnd});

    const paid = await pay({lnd, request});
  });

  const page1 = await getPayments({lnd, limit: 2});

  const [firstOfPage1] = page1.payments;

  const page2 = await getPayments({lnd, token: page1.next});

  const [firstOfPage2] = page2.payments;

  equal(firstOfPage2.index, 3, 'Got payment index');

  const page3 = await getPayments({lnd, token: page2.next});

  equal(!!page3.next, false, 'There is no page 4');

  await kill({});

  return end();
});
