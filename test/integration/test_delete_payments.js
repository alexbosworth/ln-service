const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {deletePayments} = require('./../../');
const {getPayments} = require('./../../');
const {pay} = require('./../../');

const size = 2;
const times = 1000;
const tokens = 100;

// Deleting payments should delete all payments
test('Delete payments', async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await setupChannel({generate, lnd, to: target});

  const invoice = await createInvoice({tokens, lnd: target.lnd});

  const paid = await asyncRetry({times}, async () => {
    return await pay({lnd, request: invoice.request});
  });

  const priorLength = (await getPayments({lnd})).payments.length;

  await deletePayments({lnd});

  const wipedLength = (await getPayments({lnd})).payments.length;

  strictEqual(priorLength - wipedLength, [paid].length, 'History deleted');

  await kill({});

  return;
});
