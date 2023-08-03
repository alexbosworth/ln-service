const {exit} = require('node:process');
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {closeChannel} = require('./../../');
const {createHodlInvoice} = require('./../../');
const {getClosedChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {settleHodlInvoice} = require('./../../');
const {subscribeToInvoice} = require('./../../');
const {subscribeToPayViaRequest} = require('./../../');

const defaultFee = 1e3;
const interval = 125;
const maxChanTokens = Math.pow(2, 24) - 1;
const size = 2;
const times = 1000;

// Getting closed channels should return closed channels
test(`Get closed channels`, async t => {
  const {kill, nodes} = await spawnLightningCluster({size});

  t.after(() => exit());

  const [control, target] = nodes;

  const {generate, lnd} = control;

  const channelOpen = await setupChannel({
    generate,
    lnd,
    capacity: maxChanTokens,
    partner_csv_delay: 20,
    to: target,
  });

  const closing = await closeChannel({
    lnd,
    tokens_per_vbyte: defaultFee,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  const {features} = await getWalletInfo({lnd});

  const isAnchors = !!features.find(n => n.bit === 23);

  // Wait for channel to close
  await asyncRetry({interval, times}, async () => {
    await generate({});

    const {channels} = await getClosedChannels({lnd});

    if (!channels.length) {
      throw new Error('ExpectedClosedChannel');
    }
  });

  const {channels} = await getClosedChannels({lnd});

  const [channel] = channels;

  strictEqual(channels.length, [channelOpen].length, 'Channel close listed');

  const spend = maxChanTokens - channel.final_local_balance;

  // LND 0.11.1 and below do not use anchors
  if (isAnchors) {
    strictEqual([53345, 28473, 2810].includes(spend), true, 'Final');
  } else {
    strictEqual(spend, 9050, 'Final');
  }

  strictEqual(channel.capacity, maxChanTokens, 'Channel capacity reflected');
  strictEqual(!!channel.close_confirm_height, true, 'Channel close height');
  strictEqual(channel.close_transaction_id, closing.transaction_id, 'Close');
  strictEqual(channel.final_time_locked_balance, 0, 'Final locked balance');
  strictEqual(!!channel.id, true, 'Channel id');
  strictEqual(channel.is_breach_close, false, 'Not breach close');
  strictEqual(channel.is_cooperative_close, true, 'Is cooperative close');
  strictEqual(channel.is_funding_cancel, false, 'Not funding cancel');
  strictEqual(channel.is_local_force_close, false, 'Not local force close');
  strictEqual(channel.is_partner_closed, false, 'Partner did not close');
  strictEqual(channel.is_partner_initiated, false, 'Partner did not open');
  strictEqual(channel.is_remote_force_close, false, 'Not remote force close');
  strictEqual(channel.partner_public_key, target.id, 'Pubkey');
  strictEqual(channel.transaction_id, channelOpen.transaction_id, 'Channel');
  strictEqual(channel.transaction_vout, channelOpen.transaction_vout, 'Vout');

  // Setup a force close to show force close channel output
  const toForceClose = await setupChannel({
    generate,
    lnd,
    capacity: 7e5,
    give_tokens: 3e5,
    partner_csv_delay: 20,
    to: target,
  });

  const cancelInvoice = await createHodlInvoice({
    lnd,
    cltv_delta: 20,
    tokens: 1e5,
  });

  const settleInvoice = await createHodlInvoice({
    lnd,
    cltv_delta: 144,
    tokens: 1e5,
  });

  const subCancelInvoice = subscribeToInvoice({lnd, id: cancelInvoice.id});
  const subSettleInvoice = subscribeToInvoice({lnd, id: settleInvoice.id});

  const cancelInvoiceUpdates = [];
  const settleInvoiceUpdates = [];

  subCancelInvoice.on('invoice_updated', n => cancelInvoiceUpdates.push(n));
  subSettleInvoice.on('invoice_updated', n => settleInvoiceUpdates.push(n));

  // Kick off a payment to the cancel invoice
  const payToCancel = subscribeToPayViaRequest({
    lnd: target.lnd,
    request: cancelInvoice.request,
  });

  // Kick off a payment to the settle invoice
  const payToSettle = subscribeToPayViaRequest({
    lnd: target.lnd,
    request: settleInvoice.request,
  });

  await asyncRetry({interval, times}, async () => {
    if (!cancelInvoiceUpdates.filter(n => !!n.is_held).length) {
      throw new Error('WaitingForLockToCancelInvoice');
    }

    if (!settleInvoiceUpdates.filter(n => !!n.is_held).length) {
      throw new Error('WaitingForLockToSettleInvoice');
    }

    // Push the held HTLCs to chain
    await closeChannel({
      lnd: target.lnd,
      is_force_close: true,
      transaction_id: toForceClose.transaction_id,
      transaction_vout: toForceClose.transaction_vout,
    });
  });

  // Use the preimage to sweep the settle invoice on chain
  await settleHodlInvoice({lnd, secret: settleInvoice.secret});

  // LND 0.12.0 requires a delay before sweeps start
  const deadChans = await asyncRetry({interval: 1000, times: 99}, async () => {
    const {channels} = await getClosedChannels({lnd});

    if (channels.length === [toForceClose, channelOpen].length) {
      return channels;
    }

    await target.generate({});
    await generate({});

    throw new Error('WaitingForForceClose');
  });

  const forced = deadChans.find(n => !!n.is_remote_force_close);

  strictEqual(forced.capacity, 7e5, 'Got force close capacity');
  strictEqual(!!forced.close_balance_spent_by, true, 'Got a spend id');
  strictEqual(forced.close_balance_vout !== undefined, true, 'Got a vout');
  strictEqual(!!forced.close_confirm_height !== undefined, true, 'Height');
  strictEqual(forced.close_payments.length, 2, '2 pending payments');
  strictEqual(!!forced.close_transaction_id, true, 'Got closed tx id');
  strictEqual(!!forced.final_local_balance, true, 'Got final balance');
  strictEqual(forced.final_time_locked_balance, 0, 'Got timelock balance');
  strictEqual(forced.id, toForceClose.id, 'Got closed channel id');
  strictEqual(forced.is_breach_close, false, 'Not a breach');
  strictEqual(forced.is_cooperative_close, false, 'Not a coop close');
  strictEqual(forced.is_funding_cancel, false, 'Not a cancel');
  strictEqual(forced.is_local_force_close, false, 'Not a local force close');
  strictEqual(forced.is_partner_closed, true, 'The remote closed');
  strictEqual(forced.is_partner_initiated, false, 'Local initiated');
  strictEqual(forced.is_remote_force_close, true, 'Remote force closed');
  strictEqual(forced.partner_public_key, target.id, 'Got remote public key');
  strictEqual(forced.transaction_id, toForceClose.transaction_id, 'Got txid');
  strictEqual(forced.transaction_vout, toForceClose.transaction_vout, 'Vout');

  const cancelHtlc = forced.close_payments.find(n => !n.is_paid);

  strictEqual(cancelHtlc.is_outgoing, false, 'HTLC is incoming');
  strictEqual(cancelHtlc.is_paid, false, 'HTLC is not settled');
  strictEqual(cancelHtlc.is_pending, false, 'HTLC cannot be settled');
  strictEqual(cancelHtlc.is_refunded, false, 'HTLC has not been refunded');
  strictEqual(cancelHtlc.spent_by, undefined, 'HTLC has no sweep tx');
  strictEqual(cancelHtlc.tokens, 1e5, 'HTLC has invoice value');
  strictEqual(!!cancelHtlc.transaction_id, true, 'HTLC has tx id');
  strictEqual(cancelHtlc.transaction_vout !== undefined, true, 'HTLC vout');

  const settleHtlc = forced.close_payments.find(n => !!n.is_paid);

  strictEqual(settleHtlc.is_outgoing, false, 'Settle is incoming');
  strictEqual(settleHtlc.is_paid, true, 'Settle is paid');
  strictEqual(settleHtlc.is_pending, false, 'Already settled');
  strictEqual(settleHtlc.is_refunded, false, 'No refund available');
  strictEqual(!!settleHtlc.spent_by, true, 'Swept with preimage tx');
  strictEqual(settleHtlc.tokens, 1e5, 'Settled with invoice value');
  strictEqual(!!settleHtlc.transaction_id, true, 'Output tx id');
  strictEqual(settleHtlc.transaction_vout !== undefined, true, 'Output vout');

  const alsoDead = await asyncRetry({interval: 20, times: 7000}, async () => {
    const {channels} = await getClosedChannels({lnd: target.lnd});

    if (channels.length === [toForceClose, channelOpen].length) {
      return channels;
    }

    await target.generate({});

    throw new Error('WaitingForTargetForceClose');
  });

  const forceClosed = alsoDead.find(n => !!n.is_local_force_close);

  strictEqual(forceClosed.capacity, 7e5, 'Target capacity reflected');
  strictEqual(!!forceClosed.close_balance_spent_by, true, 'Target spent by');
  strictEqual(forceClosed.close_balance_vout !== undefined, true, 'Balance');
  strictEqual(!!forceClosed.close_confirm_height, true, 'Has confirm height');
  strictEqual(!!forceClosed.close_payments.length, true, 'Has close payments');
  strictEqual(!!forceClosed.close_transaction_id, true, 'Has close id');
  strictEqual(forceClosed.final_local_balance, 1e5, 'Has local balance');
  strictEqual(forceClosed.final_time_locked_balance, 3e5, 'Timelock balance');
  strictEqual(forceClosed.id, toForceClose.id, 'Has channel id');
  strictEqual(forceClosed.is_breach_close, false, 'Not breach close');
  strictEqual(forceClosed.is_cooperative_close, false, 'Not coop close');
  strictEqual(forceClosed.is_funding_cancel, false, 'Not funding cancel');
  strictEqual(forceClosed.is_local_force_close, true, 'Locally forced closed');
  strictEqual(forceClosed.is_partner_closed, false, 'Not remote closed');
  strictEqual(forceClosed.is_partner_initiated, true, 'Remote create channel');
  strictEqual(forceClosed.is_remote_force_close, false, 'Remote not force');
  strictEqual(forceClosed.partner_public_key, control.id, 'Got peer key');
  strictEqual(forceClosed.transaction_id, toForceClose.transaction_id, 'Tx');
  strictEqual(forceClosed.transaction_vout, toForceClose.transaction_vout);

  const forcePay = forceClosed.close_payments.find(n => !!n.is_paid);

  strictEqual(forcePay.is_outgoing, true, 'Payment was outgoing');
  strictEqual(forcePay.is_paid, true, 'Payment was sent');
  strictEqual(forcePay.is_pending, false, 'Payment is settled');
  strictEqual(forcePay.is_refunded, false, 'Payment completed successfully');
  strictEqual(!!forcePay.spent_by, true, 'Payment was swept with preimage');
  strictEqual(forcePay.tokens, 1e5, 'Payment tokens amount');
  strictEqual(!!forcePay.transaction_id, true, 'Got payment transaction id');
  strictEqual(forcePay.transaction_vout !== undefined, true, 'Got vout');

  const refundedHtlc = forceClosed.close_payments.find(n => !!n.is_refunded);

  strictEqual(refundedHtlc.is_outgoing, true, 'Payment was outgoing');
  strictEqual(refundedHtlc.is_paid, false, 'Payment was not paid');
  strictEqual(refundedHtlc.is_pending, false, 'Payment is resolved back');
  strictEqual(refundedHtlc.is_refunded, true, 'Payment refunded successfully');
  strictEqual(!!refundedHtlc.spent_by, true, 'Payment was swept');
  strictEqual(refundedHtlc.tokens, 1e5, 'Payment refund tokens amount');
  strictEqual(!!refundedHtlc.transaction_id, true, 'Got refund tx id');
  strictEqual(refundedHtlc.transaction_vout !== undefined, true, 'Got vout');

  await kill({});

  return;
});
