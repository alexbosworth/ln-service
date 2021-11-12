const {once} = require('events');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {getHeight} = require('./../../');
const {getInvoice} = require('./../../');
const {getPayment} = require('./../../');
const {getWalletVersion} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {subscribeToForwardRequests} = require('./../../');
const {subscribeToPayViaRequest} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const tokens = 100;

// Paying an invoice should settle the invoice
test(`Pay via payment request`, async ({end, equal, rejects, strictSame}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const channel = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

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

  const {routes} = await waitForRoute({
    lnd,
    tokens,
    destination: cluster.remote.public_key,
  });

  const [route] = routes;

  {
    const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

    const sub = subscribeToForwardRequests({lnd: cluster.target.lnd});

    sub.on('forward_request', forward => forward.reject());

    await rejects(
      payViaPaymentRequest({lnd, request: invoice.request}),
      [503, 'PaymentPathfindingFailedToFindPossibleRoute'],
      'Forward is rejected interactively'
    );

    sub.removeAllListeners();

    await deleteForwardingReputations({lnd});

    const sub2 = subscribeToForwardRequests({lnd: cluster.target.lnd});

    sub2.on('forward_request', forward => forward.reject());

    const failures = [];
    const paying = [];

    const pay = subscribeToPayViaRequest({lnd, request: invoice.request});

    pay.on('paying', pending => paying.push(pending));
    pay.on('routing_failure', failure => failures.push(failure));

    await once(pay, 'failed');

    strictSame(
      failures,
      [{
        channel: channel.id,
        index: 1,
        mtokens: '101000',
        public_key: cluster.target.public_key,
        reason: 'TemporaryChannelFailure',
        route: {
          fee: 1,
          fee_mtokens: '1000',
          hops: [
            {
              channel: channel.id,
              channel_capacity: 1e6,
              fee: 1,
              fee_mtokens: '1000',
              forward: 100,
              forward_mtokens: '100000',
              public_key: cluster.target.public_key,
              timeout: 497,
            },
            {
              channel: remoteChan.id,
              channel_capacity: 1e6,
              fee: 0,
              fee_mtokens: '0',
              forward: 100,
              forward_mtokens: '100000',
              public_key: cluster.remote.public_key,
              timeout: 497,
            },
          ],
          mtokens: '101000',
          payment: invoice.payment,
          timeout: 537,
          tokens: 101,
          total_mtokens: '100000',
        },
      }],
      'Failure is emitted'
    );

    sub2.removeAllListeners();
  }

  await deleteForwardingReputations({lnd});

  {
    const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

    const sub = subscribeToForwardRequests({lnd: cluster.target.lnd});

    sub.once('forward_request', async forward => {
      const {pending} = await getPayment({lnd, id: invoice.id});

      equal(pending.destination, cluster.remote.public_key, 'Pending remote');
      equal(!!pending.created_at, true, 'Has creation date');
      equal(pending.id, invoice.id, 'Payment id is present');
      equal(pending.mtokens, invoice.mtokens, 'Pending payment mtokens');

      strictSame(
        pending.paths,
        [{
          fee: 1,
          fee_mtokens: '1000',
          hops: [
            {
              channel: forward.in_channel,
              channel_capacity: 1e6,
              fee: 1,
              fee_mtokens: '1000',
              forward: 100,
              forward_mtokens: '100000',
              public_key: cluster.target.public_key,
              timeout: 497,
            },
            {
              channel: forward.out_channel,
              channel_capacity: 1e6,
              fee: 0,
              fee_mtokens: '0',
              forward: 100,
              forward_mtokens: '100000',
              public_key: cluster.remote.public_key,
              timeout: 497,
            },
          ],
          mtokens: '101000',
          payment: invoice.payment,
          timeout: 537,
          tokens: 101,
          total_mtokens: '100000',
        }],
        'Paths are present'
      );

      equal(pending.request, invoice.request, 'Pending pay of request');
      equal(pending.timeout, 537, 'Pending timeout');
      equal(pending.tokens, invoice.tokens, 'Pending pay of invoice tokens');

      const info = await getHeight({lnd: cluster.target.lnd});

      equal(forward.cltv_delta, 40, 'Forward has CLTV delta');
      equal(forward.fee, 1, 'Forward has a routing fee');
      equal(forward.fee_mtokens, '1000', 'Forward has precise routing fee');
      equal(forward.hash, invoice.id, 'Forward has payment hash');
      equal(forward.in_channel, channel.id, 'Forward has inbound channel')
      equal(forward.in_payment, 2, 'Forward has payment index');
      equal(forward.messages.length, [].length, 'Forward has no messages');
      equal(forward.mtokens, invoice.mtokens, 'Forward has tokens out');
      equal(forward.out_channel, remoteChan.id, 'Forward has outbound chan');
      equal(forward.timeout, info.current_block_height + 83, 'Has timeout');
      equal(forward.tokens, invoice.tokens, 'Forward has invoiced tokens');

      return forward.accept();
    });

    await payViaPaymentRequest({lnd, request: invoice.request});
  }

  {
    const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

    const {secret} = invoice;
    const sub = subscribeToForwardRequests({lnd: cluster.target.lnd});

    sub.on('forward_request', async ({settle}) => settle({secret}));

    const paid = await payViaPaymentRequest({lnd, request: invoice.request});

    equal(paid.secret, invoice.secret, 'The sender gets the preimage');

    const inv = await getInvoice({id: invoice.id, lnd: cluster.remote.lnd});

    equal(inv.is_confirmed, false, 'Receiver does not get the payment');
  }

  await cluster.kill({});

  return end();
});
