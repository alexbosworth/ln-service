const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {getHeight} = require('./../../');
const {getInvoice} = require('./../../');
const {getWalletVersion} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {subscribeToForwardRequests} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

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
  }

  await deleteForwardingReputations({lnd});

  {
    const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

    const sub = subscribeToForwardRequests({lnd: cluster.target.lnd});

    sub.once('forward_request', async forward => {
      const info = await getHeight({lnd: cluster.target.lnd});

      equal(forward.cltv_delta, 40, 'Forward has CLTV delta');
      equal(forward.fee, 1, 'Forward has a routing fee');
      equal(forward.fee_mtokens, '1000', 'Forward has precise routing fee');
      equal(forward.hash, invoice.id, 'Forward has payment hash');
      equal(forward.in_channel, channel.id, 'Forward has inbound channel')
      equal(forward.in_payment, [invoice].length, 'Forward has payment index');
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
