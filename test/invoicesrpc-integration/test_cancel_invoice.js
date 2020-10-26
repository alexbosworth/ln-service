const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const {test} = require('tap');

const {cancelHodlInvoice} = require('./../../');
const {createCluster} = require('./../macros');
const {createHodlInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getInvoice} = require('./../../');
const {getInvoices} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToInvoice} = require('./../../');

const tokens = 100;

// Create a hodl invoice, but cancel it
test(`Cancel back a hodl invoice`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  await setupChannel({lnd, generate: cluster.generate, to: cluster.target});

  const id = createHash('sha256').update(randomBytes(32)).digest('hex');

  const invoice = await createHodlInvoice({
    id,
    tokens,
    lnd: cluster.target.lnd,
  });

  const sub = subscribeToInvoice({id, lnd: cluster.target.lnd});

  sub.on('invoice_updated', async updated => {
    if (!updated.is_held) {
      return;
    }

    const [created] = (await getInvoices({lnd: cluster.target.lnd})).invoices;

    const invoice = await getInvoice({id, lnd: cluster.target.lnd});

    equal(created.is_confirmed, false, 'invoices shows not yet been settled');
    equal(created.is_held, true, 'invoices shows HTLC locked in place');
    equal(invoice.is_confirmed, false, 'HTLC has not yet been settled');
    equal(invoice.is_held, true, 'HTLC is locked in place');

    await cancelHodlInvoice({id, lnd: cluster.target.lnd});

    const [canceled] = (await getInvoices({lnd: cluster.target.lnd})).invoices;

    sub.removeAllListeners();

    await delay(2000);

    await cluster.kill({});

    end();

    return;
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

  return;
});
