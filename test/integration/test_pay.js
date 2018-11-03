const {randomBytes} = require('crypto');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const decodePaymentRequest = require('./../../decodePaymentRequest');
const getChannel = require('./../../getChannel');
const getChannels = require('./../../getChannels');
const getNetworkGraph = require('./../../getNetworkGraph');
const getRoutes = require('./../../getRoutes');
const getWalletInfo = require('./../../getWalletInfo');
const {hopsFromChannels} = require('./../../routing');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');
const {routeFromHops} = require('./../../routing');

const channelCapacityTokens = 1e6;
const confirmationCount = 10;
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

  await cluster.generate({count: confirmationCount, node: cluster.control});

  const [channel] = (await getChannels({lnd})).channels;

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

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
  equal(paid.type, 'channel_transaction', 'Payment is channel transaction');

  const expectedHops = [
    {
      channel_capacity: ((channel.capacity * reserveRatio) - commitTxFee),
      channel_id: channel.id,
      fee_mtokens: '1000',
      forward_mtokens: `${invoice.tokens}${mtokPadding}`,
      timeout: 606,
    },
    {
      channel_capacity: 999000,
      channel_id: '498078767448064',
      fee_mtokens: '0',
      forward_mtokens: '100000',
      timeout: 606,
    },
  ];

  deepIs(paid.hops, expectedHops, 'Hops are returned');

  const invoice2 = await createInvoice({lnd: cluster.remote.lnd, tokens: 100});

  const {destination} = await decodePaymentRequest({
    lnd: cluster.remote.lnd,
    request: invoice2.request,
  });

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

  cluster.kill();

  return end();
});

