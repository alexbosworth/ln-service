const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getPayment} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const start = new Date().toISOString();
const tokens = 100;

// Paying an invoice should settle the invoice
test(`Pay`, async ({end, equal, rejects, strictSame}) => {
  const cluster = await createCluster({});

  const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});
  const {lnd} = cluster.control;

  const {id} = invoice;

  await setupChannel({lnd, generate: cluster.generate, to: cluster.target});

  await rejects(getPayment({lnd, id}), [404, 'SentPaymentNotFound'], 'No res');

  try {
    await getPayment({lnd, id});
  } catch (err) {}

  try {
    await payViaPaymentRequest({lnd, request: invoice.request});
  } catch (err) {
    strictSame(err, [503, 'PaymentPathfindingFailedToFindPossibleRoute']);
  }

  const paymentStatus = await getPayment({id, lnd});

  equal(paymentStatus.is_confirmed, false, 'Unpaid shows as unconfirmed');
  equal(paymentStatus.is_failed, true, 'Failed is present when pay fails');
  equal(paymentStatus.is_pending, false, 'Failure is not pending');

  const [channel] = (await getChannels({lnd})).channels;

  await setupChannel({
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    to: cluster.remote,
  });

  const [remoteChan] = (await getChannels({lnd: cluster.remote.lnd})).channels;

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  await waitForRoute({lnd, tokens, destination: cluster.remote.public_key});

  await payViaPaymentRequest({lnd, request: invoice.request});

  try {
    equal((await getPayment({id, lnd})).is_confirmed, true, 'Paid');
    equal((await getPayment({id, lnd})).is_failed, false, 'Success');
    equal((await getPayment({id, lnd})).is_pending, false, 'Done');

    const {payment} = await getPayment({id, lnd});

    equal(payment.confirmed_at > start, true, 'Got payment confirmation date');
    equal(payment.fee_mtokens, '1000', 'Fee mtokens tokens paid');
    equal(payment.id, id, 'Payment hash is equal on both sides');
    equal(payment.mtokens, '101000', 'Paid mtokens');
    equal(payment.secret, invoice.secret, 'Paid for invoice secret');

    const height = (await getHeight({lnd})).current_block_height;

    payment.hops.forEach(n => {
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
        forward: invoice.tokens,
        forward_mtokens: invoice.mtokens,
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

    strictSame(payment.hops, expectedHops, 'Hops are returned');
  } catch (err) {
    equal(err, null, 'No error is returned');
  }

  await cluster.kill({});

  return end();
});
