const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {deleteForwardingReputations} = require('./../../');
const {getFailedPayments} = require('./../../');
const {getPayment} = require('./../../');
const {getPayments} = require('./../../');
const {payViaRoutes} = require('./../../');
const {probeForRoute} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {setupChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const tokens = 1e6 / 2;

// Getting failed payments should return failed payments
test('Get failed payments', async ({end, equal, strictSame}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const {address} = await createChainAddress({
    format: 'p2wpkh',
    lnd: cluster.remote.lnd,
  });

  // Send coins to remote so that it can accept the channel
  await sendToChainAddress({lnd, address, tokens: channelCapacityTokens})
  // Generate to confirm the tx
  await cluster.generate({count: confirmationCount, node: cluster.control});
  await cluster.generate({count: confirmationCount, node: cluster.remote});

  await setupChannel({
    lnd,
    capacity: channelCapacityTokens + channelCapacityTokens,
    generate: cluster.generate,
    to: cluster.target,
  });

  await setupChannel({
    capacity: channelCapacityTokens,
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    give: Math.round(channelCapacityTokens / 2),
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

  await delay(1000);

  try {
    await probeForRoute({
      lnd,
      destination: cluster.remote_node_public_key,
      is_ignoring_past_failures: true,
      tokens: invoice.tokens,
    });
  } catch (err) {
    const [code, message, {failure}] = err;

    equal(code, 503, 'Failed to find route');
    equal(message, 'RoutingFailure', 'Hit a routing failure');
    equal(failure.reason, 'TemporaryChannelFailure', 'Temporary failure');
  }

  // Create a new channel to increase total edge liquidity
  await setupChannel({
    capacity: channelCapacityTokens,
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    to: cluster.remote,
  });

  await deleteForwardingReputations({lnd});

  try {
    const {route} = await probeForRoute({
      lnd,
      destination: cluster.remote.public_key,
      payment: invoice.payment,
      tokens: invoice.tokens,
      total_mtokens: !!invoice.payment ? invoice.mtokens : undefined,
    });

    if (!route) {
      throw new Error('ExpectedRouteFromProbe');
    }

    equal(route.fee, 1, 'Found route fee');
    equal(route.fee_mtokens, '1500', 'Found route fee mtokens');
    strictSame(route.hops.length, 2, 'Found route hops returned');
    equal(route.mtokens, '500001500', 'Found route mtokens');
    equal(route.timeout, 586, 'Found route timeout');
    equal(route.tokens, 500001, 'Found route tokens');

    const {secret} = await payViaRoutes({
      lnd,
      id: invoice.id,
      routes: [route],
    });

    equal(secret, invoice.secret, 'Route works');
  } catch (err) {
    equal(err, null, 'No error when probing for route');
  }

  {
    const {payments} = await getFailedPayments({lnd});

    const [payment] = payments;

    equal(payment.destination, cluster.remote.public_key, 'Payment to');
    equal(payment.confirmed_at, undefined, 'No confirmation date');
    equal(!!payment.created_at, true, 'Got payment created date');
    equal(payment.fee, undefined, 'No fee when not paid');
    equal(payment.fee_mtokens, undefined, 'No fee mtokens when not paid');
    strictSame(payment.hops, [cluster.target.public_key], 'Got hops');
    equal(!!payment.id, true, 'Got a payment id');
    equal(!!payment.index, true, 'Got payment index');
    equal(payment.is_confirmed, false, 'Failed payment is not confirmed');
    equal(payment.is_outgoing, true, 'Failed payment is outgoing');
    equal(payment.mtokens, invoice.mtokens, 'Payment has mtokens');
    equal(payment.request, undefined, 'Probe has no request');
    equal(payment.secret, undefined, 'Failed has no secret');
    equal(payment.safe_fee, undefined, 'Failed has no fee');
    equal(payment.safe_tokens, invoice.tokens, 'Failed has safe tokens');
    equal(payment.tokens, invoice.tokens, 'Failed has tokens');

    const gotFailed = await getPayment({lnd, id: payment.id});

    strictSame(
      gotFailed,
      {
        failed: {
          is_insufficient_balance: false,
          is_invalid_payment: true,
          is_pathfinding_timeout: false,
          is_route_not_found: false,
        },
        is_confirmed: false,
        is_failed: true,
        is_pending: false,
        payment: undefined,
      },
      'Got failed state'
    );
  }

  {
    const {payments} = await getPayments({lnd});

    const [payment] = payments;

    equal(payment.destination, cluster.remote.public_key, 'Paid to');
    equal(!!payment.confirmed_at, true, 'Got confirmation date');
    equal(!!payment.created_at, true, 'Got payment start date');
    equal(payment.fee, 1, 'Got fee paid');
    equal(payment.fee_mtokens, '1500', 'Got fee mtokens paid');
    strictSame(payment.hops, [cluster.target.public_key], 'Got hops');
    equal(!!payment.id, true, 'Got a payment id');
    equal(!!payment.index, true, 'Got payment index');
    equal(payment.is_confirmed, true, 'Failed payment is not confirmed');
    equal(payment.is_outgoing, true, 'Failed payment is outgoing');
    equal(payment.mtokens, invoice.mtokens, 'Payment has mtokens');
    equal(payment.request, undefined, 'Probed payment has no request');
    equal(!!payment.secret, true, 'Failed has no secret');
    equal(payment.safe_fee, 2, 'Failed has no fee');
    equal(payment.safe_tokens, invoice.tokens, 'Failed has safe tokens');
    equal(payment.tokens, invoice.tokens, 'Failed has tokens');
  }

  await cluster.kill({});

  return end();
});
