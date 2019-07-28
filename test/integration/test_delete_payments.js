const {test} = require('tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deletePayments} = require('./../../');
const {getPayments} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const tokens = 100;

// Deleting payments should delete all payments
test('Delete payments', async ({afterEach, fail, end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: cluster.target.socket,
  });

  await waitForPendingChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  await waitForChannel({lnd, id: controlToTargetChannel.transaction_id});

  const invoice = await createInvoice({tokens, lnd: cluster.target.lnd});

  let paid;

  try {
    paid = await pay({lnd, request: invoice.request});
  } catch (err) {
    fail('Payment should be made to destination');

    await cluster.kill({});

    return end();
  }

  const priorLength = (await getPayments({lnd})).payments.length;

  await deletePayments({lnd});

  const wipedLength = (await getPayments({lnd})).payments.length;

  equal(priorLength - wipedLength, [paid].length, 'Payment history deleted');

  await cluster.kill({});

  return end();
});
