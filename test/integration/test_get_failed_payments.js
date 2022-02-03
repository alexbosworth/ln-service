const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {getChainBalance} = require('./../../');
const {getFailedPayments} = require('./../../');
const {getPayment} = require('./../../');
const {getPayments} = require('./../../');
const {pay} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {setupChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const count = 100;
const size = 3;
const times = 1000;
const tokens = 1e6 / 2;

// Getting failed payments should return failed payments
test('Get failed payments', async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  try {
    const {address} = await createChainAddress({lnd: remote.lnd});

    await generate({count});

    // Send coins to remote so that it can accept the channel
    await sendToChainAddress({lnd, address, tokens: channelCapacityTokens});

    // Generate to confirm the tx
    await generate({count: confirmationCount});
    await remote.generate({count: confirmationCount});

    await setupChannel({
      generate,
      lnd,
      capacity: channelCapacityTokens + channelCapacityTokens,
      to: target,
    });

    await setupChannel({
      capacity: channelCapacityTokens,
      lnd: target.lnd,
      generate: target.generate,
      generator: target,
      give: Math.round(channelCapacityTokens / 2),
      to: remote,
    });

    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    const invoice = await createInvoice({tokens, lnd: remote.lnd});

    const bigInvoice = await createInvoice({
      tokens: (channelCapacityTokens / 2) + (channelCapacityTokens / 4),
      lnd: remote.lnd,
    });

    try {
      await pay({lnd, request: bigInvoice.request});
    } catch (err) {
    }

    // Create a new channel to increase total edge liquidity
    await setupChannel({
      capacity: channelCapacityTokens,
      lnd: target.lnd,
      generate: target.generate,
      generator: target,
      to: remote,
    });

    await deleteForwardingReputations({lnd});

    await asyncRetry({times}, async () => {
      await pay({lnd, request: invoice.request});
    });

    {
      const {payments} = await getFailedPayments({lnd});

      const [payment] = payments.filter(n => n.mtokens === bigInvoice.mtokens);

      equal(payment.destination, remote.id, 'Payment to');
      equal(payment.confirmed_at, undefined, 'No confirmation date');
      equal(!!payment.created_at, true, 'Got payment created date');
      equal(payment.fee, undefined, 'No fee when not paid');
      equal(payment.fee_mtokens, undefined, 'No fee mtokens when not paid');
      equal(!!payment.id, true, 'Got a payment id');
      equal(!!payment.index, true, 'Got payment index');
      equal(payment.is_confirmed, false, 'Failed payment is not confirmed');
      equal(payment.is_outgoing, true, 'Failed payment is outgoing');
      equal(payment.mtokens, bigInvoice.mtokens, 'Payment has mtokens');
      equal(payment.request, bigInvoice.request, 'Probe has a request');
      equal(payment.secret, undefined, 'Failed has no secret');
      equal(payment.safe_fee, undefined, 'Failed has no fee');
      equal(payment.safe_tokens, bigInvoice.tokens, 'Failed has safe tokens');
      equal(payment.tokens, bigInvoice.tokens, 'Failed has tokens');

      const gotFailed = await getPayment({lnd, id: payment.id});

      strictSame(
        gotFailed,
        {
          failed: {
            is_insufficient_balance: false,
            is_invalid_payment: false,
            is_pathfinding_timeout: false,
            is_route_not_found: true,
          },
          is_confirmed: false,
          is_failed: true,
          is_pending: false,
          payment: undefined,
          pending: undefined,
        },
        'Got failed state'
      );
    }

    {
      const {payments} = await getPayments({lnd});

      const [payment] = payments;

      equal(payment.destination, remote.id, 'Paid to');
      equal(!!payment.confirmed_at, true, 'Got confirmation date');
      equal(!!payment.created_at, true, 'Got payment start date');
      equal(payment.fee, 1, 'Got fee paid');
      equal(payment.fee_mtokens, '1500', 'Got fee mtokens paid');
      strictSame(payment.hops, [target.id], 'Got hops');
      equal(!!payment.id, true, 'Got a payment id');
      equal(!!payment.index, true, 'Got payment index');
      equal(payment.is_confirmed, true, 'Failed payment is not confirmed');
      equal(payment.is_outgoing, true, 'Failed payment is outgoing');
      equal(payment.mtokens, invoice.mtokens, 'Payment has mtokens');
      equal(payment.request, invoice.request, 'Payment has a request');
      equal(!!payment.secret, true, 'Failed has no secret');
      equal(payment.safe_fee, 2, 'Failed has no fee');
      equal(payment.safe_tokens, invoice.tokens, 'Failed has safe tokens');
      equal(payment.tokens, invoice.tokens, 'Failed has tokens');
    }
  } catch (err) {
    strictSame(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return end();
});
