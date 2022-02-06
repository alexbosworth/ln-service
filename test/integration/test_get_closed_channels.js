const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {closeChannel} = require('./../../');
const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {createHodlInvoice} = require('./../../');
const {delay} = require('./../macros');
const {payViaPaymentRequest} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getClosedChannels} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getSweepTransactions} = require('./../../');
const {getUtxos} = require('./../../');
const {getWalletInfo} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {settleHodlInvoice} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToInvoice} = require('./../../');
const {subscribeToPayViaRequest} = require('./../../');

const all = promise => Promise.all(promise);
const confirmationCount = 6;
const defaultFee = 1e3;
const interval = 125;
const maxChanTokens = Math.pow(2, 24) - 1;
const size = 2;
const times = 1000;

// Getting closed channels should return closed channels
test(`Get closed channels`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

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

  equal(channels.length, [channelOpen].length, 'Channel close listed');

  // LND 0.11.1 and below do not use anchors
  if (isAnchors) {
    equal(maxChanTokens - channel.final_local_balance, 2810, 'Final');
  } else {
    equal(maxChanTokens - channel.final_local_balance, 9050, 'Final');
  }

  equal(channel.capacity, maxChanTokens, 'Channel capacity reflected');
  equal(!!channel.close_confirm_height, true, 'Channel close height');
  equal(channel.close_transaction_id, closing.transaction_id, 'Close tx id');
  equal(channel.final_time_locked_balance, 0, 'Final locked balance');
  equal(!!channel.id, true, 'Channel id');
  equal(channel.is_breach_close, false, 'Not breach close');
  equal(channel.is_cooperative_close, true, 'Is cooperative close');
  equal(channel.is_funding_cancel, false, 'Not funding cancel');
  equal(channel.is_local_force_close, false, 'Not local force close');
  equal(channel.is_partner_closed, false, 'Partner did not close the chan');
  equal(channel.is_partner_initiated, false, 'Partner did not open channel');
  equal(channel.is_remote_force_close, false, 'Not remote force close');
  equal(channel.partner_public_key, target.id, 'Pubkey');
  equal(channel.transaction_id, channelOpen.transaction_id, 'Channel tx id');
  equal(channel.transaction_vout, channelOpen.transaction_vout, 'Chan vout');

  // Setup a force close to show force close channel output
  const toForceClose = await setupChannel({
    generate,
    lnd,
    capacity: 7e5,
    give: 3e5,
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

  equal(forced.capacity, 7e5, 'Got force close capacity');
  equal(!!forced.close_balance_spent_by, true, 'Got a spend id');
  equal(forced.close_balance_vout !== undefined, true, 'Got a spend vout');
  equal(!!forced.close_confirm_height !== undefined, true, 'Confirm height');
  equal(forced.close_payments.length, 2, '2 pending payments');
  equal(!!forced.close_transaction_id, true, 'Got closed tx id');
  equal(!!forced.final_local_balance, true, 'Got final balance');
  equal(forced.final_time_locked_balance, 0, 'Got timelock balance');
  equal(forced.id, toForceClose.id, 'Got closed channel id');
  equal(forced.is_breach_close, false, 'Not a breach');
  equal(forced.is_cooperative_close, false, 'Not a coop close');
  equal(forced.is_funding_cancel, false, 'Not a cancel');
  equal(forced.is_local_force_close, false, 'Not a local force close');
  equal(forced.is_partner_closed, true, 'The remote closed');
  equal(forced.is_partner_initiated, false, 'Local initiated');
  equal(forced.is_remote_force_close, true, 'Remote force closed');
  equal(forced.partner_public_key, target.id, 'Got remote public key');
  equal(forced.transaction_id, toForceClose.transaction_id, 'Got txid');
  equal(forced.transaction_vout, toForceClose.transaction_vout, 'Got vout');

  const cancelHtlc = forced.close_payments.find(n => !n.is_paid);

  equal(cancelHtlc.is_outgoing, false, 'HTLC is incoming');
  equal(cancelHtlc.is_paid, false, 'HTLC is not settled');
  equal(cancelHtlc.is_pending, false, 'HTLC cannot be settled');
  equal(cancelHtlc.is_refunded, false, 'HTLC has not been refunded');
  equal(cancelHtlc.spent_by, undefined, 'HTLC has no sweep tx');
  equal(cancelHtlc.tokens, 1e5, 'HTLC has invoice value');
  equal(!!cancelHtlc.transaction_id, true, 'HTLC has tx id');
  equal(cancelHtlc.transaction_vout !== undefined, true, 'HTLC has tx vout');

  const settleHtlc = forced.close_payments.find(n => !!n.is_paid);

  equal(settleHtlc.is_outgoing, false, 'Settle is incoming');
  equal(settleHtlc.is_paid, true, 'Settle is paid');
  equal(settleHtlc.is_pending, false, 'Already settled');
  equal(settleHtlc.is_refunded, false, 'No refund available');
  equal(!!settleHtlc.spent_by, true, 'Swept with preimage tx');
  equal(settleHtlc.tokens, 1e5, 'Settled with invoice value');
  equal(!!settleHtlc.transaction_id, true, 'Output tx id');
  equal(settleHtlc.transaction_vout !== undefined, true, 'Output tx vout');

  const alsoDead = await asyncRetry({interval: 2000, times: 99}, async () => {
    const {channels} = await getClosedChannels({lnd: target.lnd});

    if (channels.length === [toForceClose, channelOpen].length) {
      return channels;
    }

    await target.generate({count: 100});

    throw new Error('WaitingForTargetForceClose');
  });

  const forceClosed = alsoDead.find(n => !!n.is_local_force_close);

  equal(forceClosed.capacity, 7e5, 'Target capacity reflected');
  equal(!!forceClosed.close_balance_spent_by, true, 'Target spent by');
  equal(forceClosed.close_balance_vout !== undefined, true, 'Has balance out');
  equal(!!forceClosed.close_confirm_height, true, 'Has confirm height');
  equal(!!forceClosed.close_payments.length, true, 'Has close payments');
  equal(!!forceClosed.close_transaction_id, true, 'Has close id');
  equal(forceClosed.final_local_balance, 1e5, 'Has local balance');
  equal(forceClosed.final_time_locked_balance, 3e5, 'Has timelock balance');
  equal(forceClosed.id, toForceClose.id, 'Has channel id');
  equal(forceClosed.is_breach_close, false, 'Not breach close');
  equal(forceClosed.is_cooperative_close, false, 'Not coop close');
  equal(forceClosed.is_funding_cancel, false, 'Not funding cancel');
  equal(forceClosed.is_local_force_close, true, 'Locally forced closed');
  equal(forceClosed.is_partner_closed, false, 'Not remote closed');
  equal(forceClosed.is_partner_initiated, true, 'Remote created channel');
  equal(forceClosed.is_remote_force_close, false, 'Remote not force closed');
  equal(forceClosed.partner_public_key, control.id, 'Got peer key');
  equal(forceClosed.transaction_id, toForceClose.transaction_id, 'Got tx id');
  equal(forceClosed.transaction_vout, toForceClose.transaction_vout, 'Vout');

  const forcePay = forceClosed.close_payments.find(n => !!n.is_paid);

  equal(forcePay.is_outgoing, true, 'Payment was outgoing');
  equal(forcePay.is_paid, true, 'Payment was sent');
  equal(forcePay.is_pending, false, 'Payment is settled');
  equal(forcePay.is_refunded, false, 'Payment completed successfully');
  equal(!!forcePay.spent_by, true, 'Payment was swept with preimage');
  equal(forcePay.tokens, 1e5, 'Payment tokens amount');
  equal(!!forcePay.transaction_id, true, 'Got payment transaction id');
  equal(forcePay.transaction_vout !== undefined, true, 'Got payment vout');

  const refundedHtlc = forceClosed.close_payments.find(n => !!n.is_refunded);

  equal(refundedHtlc.is_outgoing, true, 'Payment was outgoing');
  equal(refundedHtlc.is_paid, false, 'Payment was not paid');
  equal(refundedHtlc.is_pending, false, 'Payment is resolved back');
  equal(refundedHtlc.is_refunded, true, 'Payment refunded successfully');
  equal(!!refundedHtlc.spent_by, true, 'Payment was swept with preimage');
  equal(refundedHtlc.tokens, 1e5, 'Payment refund tokens amount');
  equal(!!refundedHtlc.transaction_id, true, 'Got refund transaction id');
  equal(refundedHtlc.transaction_vout !== undefined, true, 'Got refund vout');

  await kill({});

  return end();
});
