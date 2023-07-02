const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncTimesSeries = require('async/timesSeries');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {getPayments} = require('./../../');
const {pay} = require('./../../');

const start = new Date().toISOString();
const size = 2;
const tokens = 100;

// Getting payments should return the list of payments
test('Get payments', async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await setupChannel({generate, lnd, to: target});

  const invoice = await createInvoice({tokens, lnd: target.lnd});

  const paid = await pay({lnd, request: invoice.request});

  const [payment] = (await getPayments({lnd})).payments;

  strictEqual(payment.destination, target.id, 'Destination');
  strictEqual(payment.confirmed_at > start, true, 'Got confirmed date');
  strictEqual(payment.created_at.length, 24, 'Created at time');
  strictEqual(payment.fee, 0, 'Fee paid');
  strictEqual(payment.hops.length, [].length, 'Hops');
  strictEqual(payment.id, invoice.id, 'Id');
  strictEqual(payment.is_confirmed, true, 'Confirmed');
  strictEqual(payment.is_outgoing, true, 'Outgoing');
  strictEqual(payment.mtokens, (BigInt(tokens) * BigInt(1e3)).toString(), 'M');
  strictEqual(payment.secret, invoice.secret, 'Payment secret');
  strictEqual(payment.tokens, tokens, 'Paid tokens');

  if (!!payment.request) {
    strictEqual(payment.request, invoice.request, 'Returns original request');
  }

  await asyncTimesSeries(4, async () => {
    const {request} = await createInvoice({tokens, lnd: target.lnd});

    const paid = await pay({lnd, request});
  });

  const page1 = await getPayments({lnd, limit: 2});

  const [firstOfPage1] = page1.payments;

  const page2 = await getPayments({lnd, token: page1.next});

  const [firstOfPage2] = page2.payments;

  strictEqual(firstOfPage2.index, 3, 'Got payment index');

  const page3 = await getPayments({lnd, token: page2.next});

  strictEqual(!!page3.next, false, 'There is no page 4');

  await kill({});

  return;
});
