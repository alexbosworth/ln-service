const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getPayment} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const size = 3;
const start = new Date().toISOString();
const tokens = 100;

// Paying an invoice should settle the invoice
test(`Pay`, async ({end, equal, rejects, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  const invoice = await createInvoice({tokens, lnd: remote.lnd});

  const {id} = invoice;

  await setupChannel({generate, lnd, to: target});

  await rejects(getPayment({lnd, id}), [404, 'SentPaymentNotFound'], 'None');

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
    lnd: target.lnd,
    generate: target.generate,
    to: remote,
  });

  const [remoteChan] = (await getChannels({lnd: remote.lnd})).channels;

  await addPeer({lnd, public_key: remote.id, socket: remote.socket});

  await waitForRoute({lnd, tokens, destination: remote.id});

  await payViaPaymentRequest({lnd, request: invoice.request});

  try {
    equal((await getPayment({id, lnd})).is_confirmed, true, 'Paid');
    equal((await getPayment({id, lnd})).is_failed, false, 'Success');
    equal((await getPayment({id, lnd})).is_pending, false, 'Done');

    const {payment} = await getPayment({id, lnd});

    equal(payment.confirmed_at > start, true, 'Got payment conf date');
    equal(payment.created_at > start, true, 'Got payment created at date');
    equal(payment.destination, remote.id);
    equal(payment.fee_mtokens, '1000', 'Fee mtokens tokens paid');
    equal(payment.id, id, 'Payment hash is equal on both sides');
    equal(payment.mtokens, '101000', 'Paid mtokens');
    equal(payment.request, invoice.request, 'Got payment request');
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

    strictSame(payment.hops, expectedHops, 'Hops are returned');
  } catch (err) {
    equal(err, null, 'No error is returned');
  }

  await kill({});

  return end();
});
