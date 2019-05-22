const {test} = require('tap');

const {createCluster} = require('./../macros');
const createHodlInvoice = require('./../../createHodlInvoice');
const createInvoice = require('./../../createInvoice');
const {delay} = require('./../macros');
const getChannels = require('./../../getChannels');
const getInvoice = require('./../../getInvoice');
const getInvoices = require('./../../getInvoices');
const getWalletInfo = require('./../../getWalletInfo');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');
const settleHodlInvoice = require('./../../settleHodlInvoice');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const cltvDelta = 144;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const sweepBlockCount = 40;
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

  await waitForChannel({lnd, id: controlToTargetChannel.transaction_id});

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await waitForPendingChannel({
    lnd: cluster.target.lnd,
    id: targetToRemoteChannel.transaction_id,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await waitForChannel({
    lnd: cluster.target.lnd,
    id: targetToRemoteChannel.transaction_id,
  });

  const {id, request, secret} = await createInvoice({lnd: cluster.remote.lnd});

  const invoice = await createHodlInvoice({
    id,
    tokens,
    cltv_delta: cltvDelta,
    lnd: cluster.target.lnd,
  });

  setTimeout(async () => {
    const {lnd} = cluster.target;

    const [channel] = (await getChannels({lnd})).channels
      .filter(n => n.pending_payments.length);

    const [created] = (await getInvoices({lnd})).invoices;
    const wallet = await getWalletInfo({lnd});

    const invoice = await getInvoice({id, lnd});
    const [pending] = channel.pending_payments;

    const gotCltvDelay = pending.timeout - wallet.current_block_height;
    const timeout = pending.timeout - sweepBlockCount;

    equal(gotCltvDelay, cltvDelta, 'invoice cltv delay as expected');
    equal(created.is_confirmed, false, 'invoices shows not yet been settled');
    equal(created.is_held, true, 'invoices shows HTLC locked in place');
    equal(invoice.is_confirmed, false, 'HTLC has not yet been settled');
    equal(invoice.is_held, true, 'HTLC is locked in place');

    const {secret} = await pay({lnd, request, timeout, tokens});

    await settleHodlInvoice({secret, lnd: cluster.target.lnd});

    const [settled] = (await getInvoices({lnd})).invoices;

    equal(settled.is_confirmed, true, 'HTLC is settled back');

    return setTimeout(async () => {
      await cluster.kill({});

      return end();
    },
    1000);
  },
  1000);

  const paid = await pay({lnd, request: invoice.request});

  equal(paid.secret, secret, 'Paying reveals the HTLC secret');

  return;
});
