const {deepStrictEqual} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {getFailedPayments} = require('./../../');
const {getPayment} = require('./../../');
const {getPayments} = require('./../../');
const {pay} = require('./../../');
const {sendToChainAddress} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const count = 100;
const size = 3;
const times = 1000;
const tokens = 1e6 / 2;

// Getting failed payments should return failed payments
test('Get failed payments', async () => {
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
      give_tokens: Math.round(channelCapacityTokens / 2),
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

      strictEqual(payment.destination, remote.id, 'Payment to');
      strictEqual(payment.confirmed_at, undefined, 'No confirmation date');
      strictEqual(!!payment.created_at, true, 'Got payment created date');
      strictEqual(payment.fee, undefined, 'No fee when not paid');
      strictEqual(payment.fee_mtokens, undefined, 'No fee mtokens not paid');
      strictEqual(!!payment.id, true, 'Got a payment id');
      strictEqual(!!payment.index, true, 'Got payment index');
      strictEqual(payment.is_confirmed, false, 'Failed payment not confirmed');
      strictEqual(payment.is_outgoing, true, 'Failed payment is outgoing');
      strictEqual(payment.mtokens, bigInvoice.mtokens, 'Payment has mtokens');
      strictEqual(payment.request, bigInvoice.request, 'Probe has a request');
      strictEqual(payment.secret, undefined, 'Failed has no secret');
      strictEqual(payment.safe_fee, undefined, 'Failed has no fee');
      strictEqual(payment.safe_tokens, bigInvoice.tokens, 'Safe tokens');
      strictEqual(payment.tokens, bigInvoice.tokens, 'Failed has tokens');

      const gotFailed = await getPayment({lnd, id: payment.id});

      deepStrictEqual(
        gotFailed,
        {
          failed: {
            id: payment.id,
            is_canceled: false,
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

      deepStrictEqual(payment.destination, remote.id, 'Paid to');
      deepStrictEqual(!!payment.confirmed_at, true, 'Got confirmation date');
      deepStrictEqual(!!payment.created_at, true, 'Got payment start date');
      deepStrictEqual(payment.fee, 1, 'Got fee paid');
      deepStrictEqual(payment.fee_mtokens, '1500', 'Got fee mtokens paid');
      deepStrictEqual(payment.hops, [target.id], 'Got hops');
      deepStrictEqual(!!payment.id, true, 'Got a payment id');
      deepStrictEqual(!!payment.index, true, 'Got payment index');
      deepStrictEqual(payment.is_confirmed, true, 'Failed not confirmed');
      deepStrictEqual(payment.is_outgoing, true, 'Failed payment is outgoing');
      deepStrictEqual(payment.mtokens, invoice.mtokens, 'Payment has mtokens');
      deepStrictEqual(payment.request, invoice.request, 'Payment has request');
      deepStrictEqual(!!payment.secret, true, 'Failed has no secret');
      deepStrictEqual(payment.safe_fee, 2, 'Failed has no fee');
      deepStrictEqual(payment.safe_tokens, invoice.tokens, 'Safe tokens');
      deepStrictEqual(payment.tokens, invoice.tokens, 'Failed has tokens');
    }

    await kill({});
  } catch (err) {
    await kill({});

    strictEqual(err, null, 'Expected no error');
  }

  return;
});
