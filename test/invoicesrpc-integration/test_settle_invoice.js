const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const {test} = require('tap');

const {createCluster} = require('./../macros');
const createHodlInvoice = require('./../../createHodlInvoice');
const {delay} = require('./../macros');
const getInvoice = require('./../../getInvoice');
const getInvoices = require('./../../getInvoices');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');
const settleHodlInvoice = require('./../../settleHodlInvoice');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultVout = 0;
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

  const secret = randomBytes(32);

  const invoice = await createHodlInvoice({
    tokens,
    id: createHash('sha256').update(secret).digest('hex'),
    lnd: cluster.target.invoices_lnd,
  });

  setTimeout(async () => {
    const [created] = (await getInvoices({lnd: cluster.target.lnd})).invoices;

    const invoice = await getInvoice({
      id: createHash('sha256').update(secret).digest('hex'),
      lnd: cluster.target.lnd,
    });

    equal(created.is_accepted, true, 'invoices shows HTLC locked in place');
    equal(created.is_confirmed, false, 'invoices shows not yet been settled');
    equal(invoice.is_accepted, true, 'HTLC is locked in place');
    equal(invoice.is_confirmed, false, 'HTLC has not yet been settled');

    await settleHodlInvoice({
      lnd: cluster.target.invoices_lnd,
      secret: secret.toString('hex'),
    });

    const [settled] = (await getInvoices({lnd: cluster.target.lnd})).invoices;

    equal(settled.is_confirmed, true, 'HTLC is settled back');

    return setTimeout(async () => {
      await cluster.kill({});

      return end();
    },
    1000);
  },
  1000);

  const paid = await pay({lnd, request: invoice.request});

  equal(paid.secret, secret.toString('hex'), 'Paying reveals the HTLC secret');

  return;
});
