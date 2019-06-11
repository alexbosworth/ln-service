const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const {test} = require('tap');

const {cancelHodlInvoice} = require('./../../');
const {createCluster} = require('./../macros');
const {createHodlInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getInvoice} = require('./../../');
const {getInvoices} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const tokens = 100;

// Create a hodl invoice
test(`Pay a hodl invoice`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  await waitForChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  const id = createHash('sha256').update(randomBytes(32)).digest('hex');

  const invoice = await createHodlInvoice({
    id,
    tokens,
    lnd: cluster.target.lnd,
  });

  setTimeout(async () => {
    const [created] = (await getInvoices({lnd: cluster.target.lnd})).invoices;

    const invoice = await getInvoice({id, lnd: cluster.target.lnd});

    equal(created.is_confirmed, false, 'invoices shows not yet been settled');
    equal(created.is_held, true, 'invoices shows HTLC locked in place');
    equal(invoice.is_confirmed, false, 'HTLC has not yet been settled');
    equal(invoice.is_held, true, 'HTLC is locked in place');

    await cancelHodlInvoice({id, lnd: cluster.target.lnd});

    const [canceled] = (await getInvoices({lnd: cluster.target.lnd})).invoices;

    return setTimeout(async () => {
      await cluster.kill({});

      return end();
    },
    1000);
  },
  3000);

  let cancelErr = [];

  try {
    await pay({lnd, request: invoice.request});
  } catch (err) {
    cancelErr = err;
  }

  const [code, message] = cancelErr;

  equal(code, 404, 'Canceled back HODL HTLC results in unknown payment hash');
  equal(message, 'UnknownPaymentHash', 'Get back unknown payment hash error');

  return;
});
