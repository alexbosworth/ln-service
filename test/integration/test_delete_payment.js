const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {deletePayment} = require('./../../');
const {getPayments} = require('./../../');
const {pay} = require('./../../');

const size = 2;
const tokens = 100;

// Deleting a payment should delete the payment record
test('Delete payment', async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await setupChannel({generate, lnd, to: target});

  const invoice = await createInvoice({tokens, lnd: target.lnd});

  const paid = await pay({lnd, request: invoice.request});

  const priorLength = (await getPayments({lnd})).payments.length;

  await deletePayment({lnd, id: invoice.id});

  const wipedLength = (await getPayments({lnd})).payments.length;

  strictEqual(priorLength - wipedLength, [paid].length, 'Payment deleted');

  await kill({});

  return;
});
