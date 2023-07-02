const {deepStrictEqual} = require('node:assert').strict;
const {randomBytes} = require('node:crypto');
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getHeight} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');

const confirmationCount = 6;
const interval = 10;
const mtokPadding = '000';
const size = 3;
const times = 1000;
const tokens = 100;

// Paying an invoice should settle the invoice
test(`Pay`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  const channel = await setupChannel({generate, lnd, to: target});

  const remoteChan = await setupChannel({
    generate: target.generate,
    lnd: target.lnd,
    to: remote,
  });

  await addPeer({lnd, public_key: remote.id, socket: remote.socket});

  const invoice = await createInvoice({tokens, lnd: remote.lnd});

  const commitTxFee = channel.commit_transaction_fee;

  const paid = await asyncRetry({interval, times}, async () => {
    return await pay({lnd, request: invoice.request});
  });

  strictEqual(paid.fee, 1, 'Fee paid for hop');
  strictEqual(paid.fee_mtokens, '1000', 'Fee mtokens tokens paid');
  strictEqual(paid.id, invoice.id, 'Payment hash is equal on both sides');
  strictEqual(paid.is_confirmed, true, 'Invoice is paid');
  strictEqual(paid.is_outgoing, true, 'Payments are outgoing');
  strictEqual(paid.mtokens, '101000', 'Paid mtokens');
  strictEqual(paid.secret, invoice.secret, 'Paid for invoice secret');
  strictEqual(paid.tokens, invoice.tokens + 1, 'Paid correct number of tok');

  const height = (await getHeight({lnd})).current_block_height;

  paid.hops.forEach(n => {
    strictEqual(
      n.timeout === height + 40 ||
      n.timeout === height + 43 ||
      n.timeout === height + 80,
      true
    );

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
      public_key: target.id,
    },
    {
      channel: remoteChan.id,
      channel_capacity: 1000000,
      fee: 0,
      fee_mtokens: '0',
      forward: 100,
      forward_mtokens: '100000',
      public_key: remote.id,
    },
  ];

  deepStrictEqual(paid.hops, expectedHops, 'Hops are returned');

  const invoice2 = await createInvoice({lnd: remote.lnd, tokens: 100});

  const {destination} = await decodePaymentRequest({
    lnd: remote.lnd,
    request: invoice2.request,
  });

  await generate({count: confirmationCount});

  const route = await asyncRetry({interval, times}, async () => {
    const {route} = await getRouteToDestination({
      destination,
      lnd,
      payment: invoice2.payment,
      tokens: invoice2.tokens,
      total_mtokens: !!invoice2.payment ? invoice2.mtokens : undefined,
    });

    if (!route) {
      throw new Error('ExpectedRouteToDestination');
    }

    return route;
  });

  // Test paying to a route, but to an id that isn't known
  try {
    await pay({
      lnd,
      path: {routes: [route], id: randomBytes(32).toString('hex')},
    });
  } catch (err) {
    const [code, message] = err;

    strictEqual(code, 404, 'Unknown payment hashes mean user error');
    strictEqual(message, 'UnknownPaymentHash', 'Specifically unknown error');
  }

  // Test paying regularly to a destination
  const directPay = await pay({
    lnd,
    path: {routes: [route], id: invoice2.id},
  });

  const zeroInvoice = await createInvoice({lnd: target.lnd});

  await pay({lnd, request: zeroInvoice.request, mtokens: '1000'});

  await kill({});

  return;
});
