const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getHeight} = require('./../../');
const {getInvoice} = require('./../../');
const {getInvoices} = require('./../../');
const {payViaPaymentDetails} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const size = 3;
const start = new Date().toISOString();
const tlvData = '0000';
const tlvType = '65537';
const tokens = 100;

// Paying an invoice via payment details should settle the invoice
test(`Pay via payment details`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  try {
    const channel = await setupChannel({lnd, generate, to: target});

    const remoteChan = await setupChannel({
      generate: target.generate,
      lnd: target.lnd,
      to: remote,
    });

    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    const height = (await getHeight({lnd})).current_block_height;

    const invoice = await createInvoice({
      tokens,
      cltv_delta: 40,
      lnd: remote.lnd,
    });

    const {features} = await decodePaymentRequest({
      lnd,
      request: invoice.request,
    });

    const expectedHops = [
      {
        channel: channel.id,
        channel_capacity: 1000000,
        fee: 1,
        fee_mtokens: '1000',
        forward: invoice.tokens,
        forward_mtokens: (BigInt(invoice.tokens) * BigInt(1e3)).toString(),
        public_key: target.id,
      },
      {
        channel: remoteChan.id,
        channel_capacity: 1000000,
        fee: 0,
        fee_mtokens: '0',
        forward: invoice.tokens,
        forward_mtokens: '100000',
        public_key: remote.id,
      },
    ];

    await waitForRoute({lnd, destination: remote.id, tokens: invoice.tokens});

    try {
      const paid = await payViaPaymentDetails({
        features,
        lnd,
        destination: remote.id,
        payment: invoice.payment,
        tokens: invoice.tokens,
      });
    } catch (err) {
      deepEqual(err, [503, 'PaymentRejectedByDestination']);
    }

    try {
      const tooSoonCltv = await payViaPaymentDetails({
        features,
        lnd,
        destination: remote.id,
        id: invoice.id,
        max_timeout_height: height + 46,
        payment: invoice.payment,
        tokens: invoice.tokens,
      });

      equal(tooSoonCltv, null, 'Should not be able to pay a too soon CLTV');
    } catch (err) {
      deepEqual(
        err,
        [400, 'MaxTimeoutTooNearCurrentHeightToMakePayment'],
        'Fail'
      );
    }

    try {
      const paid = await payViaPaymentDetails({
        features,
        lnd,
        destination: remote.id,
        id: invoice.id,
        max_timeout_height: height + 200,
        messages: [{type: tlvType, value: tlvData}],
        payment: invoice.payment,
        tokens: invoice.tokens,
      });

      equal(paid.confirmed_at > start, true, 'Confirm date was received');
      equal(paid.fee, 1, 'Fee tokens paid');
      equal(paid.fee_mtokens, '1000', 'Fee mtokens tokens paid');
      equal(paid.id, invoice.id, 'Payment hash is equal on both sides');
      equal(paid.mtokens, '101000', 'Paid mtokens');
      equal(paid.secret, invoice.secret, 'Paid for invoice secret');

      paid.hops.forEach(n => delete n.timeout);

      deepEqual(paid.hops, expectedHops, 'Hops are returned');
    } catch (err) {
      equal(err, null, 'No error is thrown when payment is attempted');
    }

    {
      const {payments} = await getInvoice({id: invoice.id, lnd: remote.lnd});

      if (!!payments) {
        const [payment] = payments;

        const messages = payment.messages.filter(n => n.type !== '106823');

        if (!!payment && !!messages.length) {
          const [message] = messages;

          equal(message.type, tlvType, 'Got TLV type');
          equal(message.value, tlvData, 'Got TLV value');
        }
      }
    }

    {
      const {invoices} = await getInvoices({lnd: remote.lnd});

      const [{payments}] = invoices;

      if (!!payments.length) {
        const [payment] = payments;

        const messages = payment.messages.filter(n => n.type !== '106823');

        if (!!payment && !!messages.length) {
          const [message] = messages;

          equal(message.type, tlvType, 'Got TLV type');
          equal(message.value, tlvData, 'Got TLV value');
        }
      }
    }
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return;
});
