const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const {test} = require('tap');

const cancelHodlInvoice = require('./../../cancelHodlInvoice');
const {createCluster} = require('./../macros');
const createHodlInvoice = require('./../../createHodlInvoice');
const {delay} = require('./../macros');
const getInvoice = require('./../../getInvoice');
const getInvoices = require('./../../getInvoices');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const tokens = 100;

// Create a hodl invoice
test(`Pay a hodl invoice`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  await delay(2000);

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await delay(2000);

  await cluster.generate({count: confirmationCount, node: cluster.control});

  await delay(2000);

  const id = createHash('sha256').update(randomBytes(32)).digest('hex');

  const invoice = await createHodlInvoice({
    id,
    tokens,
    lnd: cluster.target.invoices_lnd,
  });

  setTimeout(async () => {
    const [created] = (await getInvoices({lnd: cluster.target.lnd})).invoices;

    const invoice = await getInvoice({id, lnd: cluster.target.lnd});

    equal(created.is_accepted, true, 'invoices shows HTLC locked in place');
    equal(created.is_confirmed, false, 'invoices shows not yet been settled');
    equal(invoice.is_accepted, true, 'HTLC is locked in place');
    equal(invoice.is_confirmed, false, 'HTLC has not yet been settled');

    await cancelHodlInvoice({id, lnd: cluster.target.invoices_lnd});

    const [canceled] = (await getInvoices({lnd: cluster.target.lnd})).invoices;

    return setTimeout(async () => {
      await cluster.kill({});

      return end();
    },
    1000);
  },
  1000);

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
