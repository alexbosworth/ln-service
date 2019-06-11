const {randomBytes} = require('crypto');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getNetworkGraph} = require('./../../');
const {getPayment} = require('./../../');
const {getRoutes} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {routeFromHops} = require('./../../routing');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const mtokPadding = '000';
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying an invoice should settle the invoice
test(`Pay`, async ({deepIs, end, equal, rejects}) => {
  const cluster = await createCluster({});

  const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});
  const {lnd} = cluster.control;

  const {id} = invoice;

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

  rejects(getPayment({lnd, id}), [404, 'SentPaymentNotFound'], 'Not found');

  try {
    await payViaPaymentRequest({lnd, request: invoice.request});
  } catch (err) {}

  const paymentStatus = await getPayment({id, lnd});

  equal(paymentStatus.is_confirmed, false, 'Unpaid shows as unconfirmed');
  equal(paymentStatus.is_failed, true, 'Failed is present when pay fails');
  equal(paymentStatus.is_pending, false, 'Failure is not pending');

  const [channel] = (await getChannels({lnd})).channels;

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await waitForPendingChannel({
    id: targetToRemoteChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await waitForChannel({
    id: targetToRemoteChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  const [remoteChan] = (await getChannels({lnd: cluster.remote.lnd})).channels;

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  await delay(3000);

  await payViaPaymentRequest({lnd, request: invoice.request});

  equal((await getPayment({id, lnd})).is_confirmed, true, 'Paid');
  equal((await getPayment({id, lnd})).is_failed, false, 'Success');
  equal((await getPayment({id, lnd})).is_pending, false, 'Done');

  const {payment} = await getPayment({id, lnd});

  equal(payment.fee_mtokens, '1000', 'Fee mtokens tokens paid');
  equal(payment.id, id, 'Payment hash is equal on both sides');
  equal(payment.mtokens, '101000', 'Paid mtokens');
  equal(payment.secret, invoice.secret, 'Paid for invoice secret');

  const expectedHops = [
    {
      channel: channel.id,
      channel_capacity: 1000000,
      fee_mtokens: '1000',
      forward_mtokens: `${invoice.tokens}${mtokPadding}`,
      timeout: 494,
    },
    {
      channel: remoteChan.id,
      channel_capacity: 1000000,
      fee_mtokens: '0',
      forward_mtokens: '100000',
      timeout: 494,
    },
  ];

  deepIs(payment.hops, expectedHops, 'Hops are returned');

  await cluster.kill({});

  return end();
});
