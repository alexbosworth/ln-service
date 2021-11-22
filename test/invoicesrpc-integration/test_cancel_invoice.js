const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {cancelHodlInvoice} = require('./../../');
const {createHodlInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getInvoice} = require('./../../');
const {getInvoices} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToInvoice} = require('./../../');

const size = 2;
const times = 1000;
const tokens = 100;

// Create a hodl invoice, but cancel it
test(`Cancel back a hodl invoice`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await setupChannel({generate, lnd, to: target});

  const id = createHash('sha256').update(randomBytes(32)).digest('hex');

  const invoice = await createHodlInvoice({id, tokens, lnd: target.lnd});

  const sub = subscribeToInvoice({id, lnd: target.lnd});

  sub.on('invoice_updated', async updated => {
    if (!updated.is_held) {
      return;
    }

    const [created] = (await getInvoices({lnd: target.lnd})).invoices;

    const invoice = await getInvoice({id, lnd: target.lnd});

    equal(created.is_confirmed, false, 'invoices shows not yet been settled');
    equal(created.is_held, true, 'invoices shows HTLC locked in place');
    equal(invoice.is_confirmed, false, 'HTLC has not yet been settled');
    equal(invoice.is_held, true, 'HTLC is locked in place');

    await cancelHodlInvoice({id, lnd: target.lnd});
  });

  let cancelErr = [];

  try {
    await pay({lnd, request: invoice.request});
  } catch (err) {
    cancelErr = err;
  }

  const [code, message] = cancelErr;

  equal(code, 503, 'Canceled back HODL HTLC results in unknown payment hash');
  equal(message, 'PaymentRejectedByDestination', 'Got back unknownhash error');

  await kill({});

  return end();
});
