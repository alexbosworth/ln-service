const {deepStrictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {getHeight} = require('./../../');
const {getInvoice} = require('./../../');
const {getPayment} = require('./../../');
const {getPendingPayments} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {subscribeToForwardRequests} = require('./../../');
const {subscribeToPayViaRequest} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const size = 3;
const tokens = 100;

// Getting pending payments should list out payments in flight
test(`Get pending payments`, async () => {
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

      deepStrictEqual(next, undefined, 'No more pages');
      deepStrictEqual(payments.length, 1, 'A single pending payment');

      const [payment] = payments;

      deepStrictEqual(payment.destination, remote.id, 'Paying to remote');
      deepStrictEqual(payment.index, 1, 'First payment');
      deepStrictEqual(payment.request, invoice.request, 'Paying request');
      deepStrictEqual(payment.confirmed_at, undefined, 'Not a payment');
      deepStrictEqual(!!payment.created_at, true, 'Has created date');
      deepStrictEqual(payment.fee, undefined, 'No fee yet');
      deepStrictEqual(payment.fee_mtokens, undefined, 'No fee mtokens');
      deepStrictEqual(payment.hops.length, 1, 'Going through hops');
      deepStrictEqual(payment.id, invoice.id, 'Paying to the same hash');
      deepStrictEqual(payment.is_confirmed, false, 'Payment is pending');
      deepStrictEqual(payment.is_outgoing, true, 'Outgoing payment type');
      deepStrictEqual(payment.mtokens, invoice.mtokens, 'Paying invoiced');
      deepStrictEqual(payment.safe_fee, undefined, 'No fee paid yet');
      deepStrictEqual(payment.safe_tokens, invoice.tokens, 'Paying tokens');
      deepStrictEqual(payment.secret, undefined, 'Preimage not yet known');
      deepStrictEqual(payment.tokens, invoice.tokens, 'Paying invoiced');

      return forward.accept();
    });

    await payViaPaymentRequest({lnd, request: invoice.request});
  }

  await kill({});

  return;
});
