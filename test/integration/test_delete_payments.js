const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {deletePayments} = require('./../../');
const {getPayments} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');

const size = 2;
const times = 1000;
const tokens = 100;

// Deleting payments should delete all payments
test('Delete payments', async ({afterEach, fail, end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {generate, lnd} = control;

  await setupChannel({generate, lnd, to: target});

  const invoice = await createInvoice({tokens, lnd: target.lnd});

  const paid = await asyncRetry({times}, async () => {
    return await pay({lnd, request: invoice.request});
  });

  const priorLength = (await getPayments({lnd})).payments.length;

  await deletePayments({lnd});

  const wipedLength = (await getPayments({lnd})).payments.length;

  equal(priorLength - wipedLength, [paid].length, 'Payment history deleted');

  await kill({});

  return end();
});
