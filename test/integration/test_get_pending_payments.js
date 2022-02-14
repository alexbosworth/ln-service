const {once} = require('events');

const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {getHeight} = require('./../../');
const {getInvoice} = require('./../../');
const {getPayment} = require('./../../');
const {getPendingPayments} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {subscribeToForwardRequests} = require('./../../');
const {subscribeToPayViaRequest} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const size = 3;
const tokens = 100;

// Getting pending payments should list out payments in flight
test(`Get pending payments`, async ({end, equal, rejects, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  const channel = await setupChannel({generate, lnd, to: target});

  await remote.generate({count: 100});

  const remoteChan = await setupChannel({
    lnd: target.lnd,
    generate: target.generate,
    to: remote,
  });

  await addPeer({lnd, public_key: remote.id, socket: remote.socket});

  const {routes} = await waitForRoute({lnd, tokens, destination: remote.id});

  let height;
  const [route] = routes;

  {
    const invoice = await createInvoice({tokens, lnd: remote.lnd});

    const sub = subscribeToForwardRequests({lnd: target.lnd});

    sub.once('forward_request', async forward => {
      const {pending} = await getPayment({lnd, id: invoice.id});

      const {next, payments} = await getPendingPayments({lnd});

      strictSame(next, undefined, 'No more pages');
      strictSame(payments.length, 1, 'A single pending payment');

      const [payment] = payments;

      strictSame(payment.destination, remote.id, 'Paying to remote');
      strictSame(payment.index, 1, 'First payment');
      strictSame(payment.request, invoice.request, 'Paying invoice request');
      strictSame(payment.confirmed_at, undefined, 'Not a confirmed payment');
      strictSame(!!payment.created_at, true, 'Has created date');
      strictSame(payment.fee, undefined, 'No fee yet');
      strictSame(payment.fee_mtokens, undefined, 'No fee mtokens');
      strictSame(payment.hops.length, 1, 'Going through hops');
      strictSame(payment.id, invoice.id, 'Paying to the same hash');
      strictSame(payment.is_confirmed, false, 'Payment is pending');
      strictSame(payment.is_outgoing, true, 'Outgoing payment type');
      strictSame(payment.mtokens, invoice.mtokens, 'Paying invoiced mtokens');
      strictSame(payment.safe_fee, undefined, 'No fee paid yet');
      strictSame(payment.safe_tokens, invoice.tokens, 'Paying safe tokens');
      strictSame(payment.secret, undefined, 'Preimage not yet known');
      strictSame(payment.tokens, invoice.tokens, 'Paying invoiced tokens');

      return forward.accept();
    });

    await payViaPaymentRequest({lnd, request: invoice.request});
  }

  await kill({});

  return end();
});
