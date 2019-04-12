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
const {subscribeToInvoice} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultVout = 0;
const tokens = 100;

// Subscribe to canceled invoice should return invoice canceled event
test(`Subscribe to canceled invoice`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});
  let currentInvoice;

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

  const secret = randomBytes(32);

  const sub = subscribeToInvoice({
    id: createHash('sha256').update(secret).digest('hex'),
    lnd: cluster.target.invoices_lnd,
  });

  sub.on('data', data => currentInvoice = data);

  const invoice = await createHodlInvoice({
    tokens,
    id: createHash('sha256').update(secret).digest('hex'),
    lnd: cluster.target.invoices_lnd,
  });

  await delay(1000);

  equal(!!currentInvoice.is_held, false, 'Invoice is not held yet');
  equal(!!currentInvoice.is_canceled, false, 'Invoice is not canceled');
  equal(!!currentInvoice.is_confirmed, false, 'Invoice is not confirmed yet');

  setTimeout(async () => {
    equal(!!currentInvoice.is_held, true, 'Invoice is not held yet');
    equal(!!currentInvoice.is_canceled, false, 'Invoice is not canceled yet');
    equal(!!currentInvoice.is_confirmed, false, 'Invoice is confirmed');

    await cancelHodlInvoice({
      id: createHash('sha256').update(secret).digest('hex'),
      lnd: cluster.target.invoices_lnd,
    });

    await delay(1000);

    equal(!!currentInvoice.is_held, false, 'Invoice is not held yet');
    equal(!!currentInvoice.is_canceled, true, 'Invoice is canceled');
    equal(!!currentInvoice.is_confirmed, false, 'Invoice is not confirmed');

    return setTimeout(async () => {
      await cluster.kill({});
    },
    1000);
  },
  1000);

  let payErr = [];

  try {
    await pay({lnd, request: invoice.request});
  } catch (err) {
    payErr = err;
  }

  const [errCode, errMsg] = payErr;

  equal(errCode, 404, 'Expected error code for canceled invoice');
  equal(errMsg, 'UnknownPaymentHash', 'Expected error message for invoice');

  await delay(5000);

  return end();
});
