const {randomBytes} = require('crypto');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getNetworkGraph} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');
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

  const channel = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  const remoteChan = await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
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

  const height = (await getHeight({lnd})).current_block_height;

  paid.hops.forEach(n => {
    equal(n.timeout === height + 40 || n.timeout === height + 43, true);

    delete n.timeout;

    return;
  });

  const expectedHops = [
    {
      channel: channel.id,
      channel_capacity: 1000000,
      fee: 1,
      fee_mtokens: '1000',
      forward: 100,
      forward_mtokens: `${invoice.tokens}${mtokPadding}`,
      public_key: cluster.target.public_key,
    },
    {
      channel: remoteChan.id,
      channel_capacity: 1000000,
      fee: 0,
      fee_mtokens: '0',
      forward: 100,
      forward_mtokens: '100000',
      public_key: cluster.remote.public_key,
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

  const {route} = await getRouteToDestination({
    destination,
    lnd,
    tokens: invoice2.tokens,
  });

  // Test paying to a route, but to an id that isn't known
  try {
    await pay({
      lnd: cluster.control.lnd,
      path: {routes: [route], id: randomBytes(32).toString('hex')},
    });
  } catch (err) {
    const [code, message] = err;

    equal(code, 404, 'Unknown payment hashes mean user error');
    equal(message, 'UnknownPaymentHash', 'Specifically an unknown hash error');
  }

  // Test paying regularly to a destination
  const directPay = await pay({
    lnd: cluster.control.lnd,
    path: {routes: [route], id: invoice2.id},
  });

  await cluster.kill({});

  return end();
});
