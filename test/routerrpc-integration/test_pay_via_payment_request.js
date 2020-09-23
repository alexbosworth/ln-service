const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {getInvoice} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {payViaPaymentRequest} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const tlvType = '67890';
const tlvValue = '0102';
const tokens = 100;

// Paying an invoice should settle the invoice
test(`Pay via payment request`, async ({deepIs, end, equal, rejects}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const channel = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  // Make sure that an error is returned when there is no route
  try {
    const {request} = await createInvoice({tokens, lnd: cluster.remote.lnd});

    rejects(
      payViaPaymentRequest({lnd, request}),
      [503, 'PaymentPathfindingFailedToFindPossibleRoute'],
      'A payment with no route returns an error'
    );
  } catch (err) {
    equal(err, null, 'Expected no error creating invoice');
  }

  const remoteChan = await setupChannel({
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  await waitForRoute({lnd, tokens, destination: cluster.remote.public_key});

  // When a route exists, payment is successful
  try {
    const commitTxFee = channel.commit_transaction_fee;
    const height = (await getWalletInfo({lnd})).current_block_height;
    const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

    const paid = await payViaPaymentRequest({
      lnd,
      max_timeout_height: height + 40 + 43,
      messages: [{type: tlvType, value: tlvValue}],
      request: invoice.request,
    });

    equal(paid.fee, 1, 'Fee tokens paid');
    equal(paid.fee_mtokens, '1000', 'Fee mtokens tokens paid');
    equal(paid.id, invoice.id, 'Payment hash is equal on both sides');
    equal(paid.mtokens, '101000', 'Paid mtokens');
    equal(paid.secret, invoice.secret, 'Paid for invoice secret');

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

    deepIs(paid.hops, expectedHops, 'Hops are returned');

    const {payments} = await getInvoice({
      id: paid.id,
      lnd: cluster.remote.lnd,
    });

    if (!!payments.length) {
      const [payment] = payments;

      if (!!payment.messages.length) {
        const [message] = payment.messages;

        equal(message.type, tlvType, 'Got TLV message type');
        equal(message.value, tlvValue, 'Got TLV message value');
      }
    }
  } catch (err) {
    equal(err, null, 'Expected no error paying payment request');
  }

  await cluster.kill({});

  return end();
});
