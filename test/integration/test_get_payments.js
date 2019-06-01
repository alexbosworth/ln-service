const {test} = require('tap');

const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const {delay} = require('./../macros');
const getPayments = require('./../../getPayments');
const getWalletInfo = require('./../../getWalletInfo');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const mtokPadding = '000';
const tokens = 100;

// Getting payments should return the list of payments
test('Get payments', async ({end, equal}) => {
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

  const invoice = await createInvoice({tokens, lnd: cluster.target.lnd});

  const paid = await pay({lnd, request: invoice.request});

  const [payment] = (await getPayments({lnd})).payments;

  equal(payment.destination, cluster.target_node_public_key, 'Destination');
  equal(payment.created_at.length, 24, 'Created at time');
  equal(payment.fee, 0, 'Fee paid');
  equal(payment.hops.length, 0, 'Hops');
  equal(payment.id, invoice.id, 'Id');
  equal(payment.is_confirmed, true, 'Confirmed');
  equal(payment.is_outgoing, true, 'Outgoing');
  equal(payment.mtokens, `${tokens}${mtokPadding}`, 'Millitokens');
  equal(payment.secret, invoice.secret, 'Payment secret');
  equal(payment.tokens, tokens, 'Paid tokens');
  equal(payment.type, 'channel_transaction', 'Channel transaction');

  if (!!payment.request) {
    equal(payment.request, invoice.request, 'Returns original pay request');
  }

  await cluster.kill({});

  return end();
});
