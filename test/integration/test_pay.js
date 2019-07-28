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
const {getRoutes} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {routeFromHops} = require('./../../routing');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const mtokPadding = '000';
const reserveRatio = 0.99;
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying an invoice should settle the invoice
test(`Pay`, async ({deepIs, end, equal}) => {
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
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await delay(3000);

  const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

  const commitTxFee = channel.commit_transaction_fee;
  const paid = await pay({lnd, request: invoice.request});

  equal(paid.fee, 1, 'Fee paid for hop');
  equal(paid.fee_mtokens, '1000', 'Fee mtokens tokens paid');
  equal(paid.id, invoice.id, 'Payment hash is equal on both sides');
  equal(paid.is_confirmed, true, 'Invoice is paid');
  equal(paid.is_outgoing, true, 'Payments are outgoing');
  equal(paid.mtokens, '101000', 'Paid mtokens');
  equal(paid.secret, invoice.secret, 'Paid for invoice secret');
  equal(paid.tokens, invoice.tokens + 1, 'Paid correct number of tokens');

  const height = (await getWalletInfo({lnd})).current_block_height;

  paid.hops.forEach(n => {
    equal(n.timeout === height + 40 || n.timeout === height + 43, true);

    delete n.timeout;

    return;
  });

  const expectedHops = [
    {
      channel: channel.id,
      channel_capacity: 1000000,
      fee_mtokens: '1000',
      forward_mtokens: `${invoice.tokens}${mtokPadding}`,
    },
    {
      channel: remoteChan.id,
      channel_capacity: 1000000,
      fee_mtokens: '0',
      forward_mtokens: '100000',
    },
  ];

  deepIs(paid.hops, expectedHops, 'Hops are returned');

  const invoice2 = await createInvoice({lnd: cluster.remote.lnd, tokens: 100});

  const {destination} = await decodePaymentRequest({
    lnd: cluster.remote.lnd,
    request: invoice2.request,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  await delay(3000);

  const {routes} = await getRoutes({
    destination,
    lnd,
    tokens: invoice2.tokens,
  });

  // Test paying to a route, but to an id that isn't known
  try {
    await pay({
      lnd: cluster.control.lnd,
      path: {routes, id: randomBytes(32).toString('hex')},
    });
  } catch (err) {
    const [code, message] = err;

    equal(code, 404, 'Unknown payment hashes mean user error');
    equal(message, 'UnknownPaymentHash', 'Specifically an unknown hash error');
  }

  // Test paying regularly to a destination
  const directPay = await pay({
    lnd: cluster.control.lnd,
    path: {routes, id: invoice2.id},
  });

  await cluster.kill({});

  return end();
});
