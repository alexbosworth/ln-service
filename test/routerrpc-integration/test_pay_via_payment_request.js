const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {getInvoice} = require('./../../');
const {getWalletInfo} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const interval = 50;
const size = 3;
const start = new Date().toISOString();
const times = 3000;
const tlvType = '67890';
const tlvValue = '0102';
const tokens = 100;

// Paying an invoice should settle the invoice
test(`Pay via payment request`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  try {
    await generate({count: 100});

    await asyncRetry({interval, times}, async () => {
      const wallet = await getWalletInfo({lnd: remote.lnd});

      await remote.generate({});

      if (!wallet.is_synced_to_chain) {
        throw new Error('NotSyncedToChain');
      }
    });

    const channel = await asyncRetry({interval, times}, async () => {
      return await setupChannel({generate, lnd, to: target});
    });

    // Make sure that an error is returned when there is no route
    try {
      const {request} = await createInvoice({tokens, lnd: remote.lnd});

      await rejects(
        payViaPaymentRequest({lnd, request}),
        [503, 'PaymentPathfindingFailedToFindPossibleRoute'],
        'A payment with no route returns an error'
      );
    } catch (err) {
      equal(err, null, 'Expected no error creating invoice');
    }

    await addPeer({
      lnd: target.lnd,
      public_key: remote.id,
      socket: remote.socket,
    });

    const remoteChan = await setupChannel({
      lnd: target.lnd,
      generate: target.generate,
      to: remote,
    });

    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    await waitForRoute({lnd, tokens, destination: remote.id});

    // When a route exists, payment is successful
    try {
      const commitTxFee = channel.commit_transaction_fee;
      const height = (await getWalletInfo({lnd})).current_block_height;
      const invoice = await createInvoice({tokens, lnd: remote.lnd});

      const paid = await payViaPaymentRequest({
        lnd,
        max_timeout_height: height + 40 + 43,
        messages: [{type: tlvType, value: tlvValue}],
        request: invoice.request,
      });

      equal(paid.confirmed_at > start, true, 'Got confirmation date');
      equal(paid.fee, 1, 'Fee tokens paid');
      equal(paid.fee_mtokens, '1000', 'Fee mtokens tokens paid');
      equal(paid.id, invoice.id, 'Payment hash is equal on both sides');
      equal(paid.index, '2', 'Got payment offset index');
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

      deepEqual(paid.hops, expectedHops, 'Hops are returned');

      const {payments} = await getInvoice({id: paid.id, lnd: remote.lnd});

      if (!!payments.length) {
        const [payment] = payments;

        const messages = payment.messages.filter(n => n.type !== '106823');

        if (!!messages.length) {
          const [message] = messages;

          equal(message.type, tlvType, 'Got TLV message type');
          equal(message.value, tlvValue, 'Got TLV message value');
        }
      }
    } catch (err) {
      equal(err, null, 'Expected no error paying payment request');
    }
  } catch (err) {
    equal(err, 'Expected no errors');
  }

  await kill({});

  return;
});
