const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {closeChannel} = require('./../../');
const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {createHodlInvoice} = require('./../../');
const {delay} = require('./../macros');
const {payViaPaymentRequest} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getChannels} = require('./../../');
const {getClosedChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getSweepTransactions} = require('./../../');
const {getUtxos} = require('./../../');
const {getWalletInfo} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {settleHodlInvoice} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToInvoice} = require('./../../');

const all = promise => Promise.all(promise);
const confirmationCount = 6;
const defaultFee = 1e3;
const interval = 125;
const maxChanTokens = Math.pow(2, 24) - 1;
const times = 1000;

// Getting closed channels should return closed channels
test(`Get closed channels`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channelOpen = await setupChannel({
    lnd,
    capacity: maxChanTokens,
    generate: cluster.generate,
    partner_csv_delay: 20,
    to: cluster.target,
  });

  const closing = await closeChannel({
    lnd: cluster.control.lnd,
    tokens_per_vbyte: defaultFee,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  const {features} = await getWalletInfo({lnd});

  const isAnchors = !!features.find(n => n.bit === 23);

  // Wait for channel to close
  await asyncRetry({interval, times}, async () => {
    await cluster.generate({});

    const {channels} = await getClosedChannels({lnd});

    if (!channels.length) {
      throw new Error('ExpectedClosedChannel');
    }
  });

  const {channels} = await getClosedChannels({lnd: cluster.control.lnd});

  const [channel] = channels;

  equal(channels.length, [channelOpen].length, 'Channel close listed');

  if (!!channel) {
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
    equal(channel.is_remote_force_close, false, 'Not remote force close');
    equal(channel.partner_public_key, cluster.target_node_public_key, 'Pubkey');
    equal(channel.transaction_id, channelOpen.transaction_id, 'Channel tx id');
    equal(channel.transaction_vout, channelOpen.transaction_vout, 'Chan vout');
  }

  equal(channel.is_partner_closed, false, 'Partner did not close the chan');
  equal(channel.is_partner_initiated, false, 'Partner did not open channel');

  // Setup a force close to show force close channel output
  const toForceClose = await setupChannel({
    lnd,
    capacity: 7e5,
    generate: cluster.generate,
    give: 3e5,
    partner_csv_delay: 20,
    to: cluster.target,
  });

  const cancelInvoice = await createHodlInvoice({
    lnd,
    cltv_delta: 20,
    tokens: 1e5,
  });

  const claimInvoice = await createHodlInvoice({
    lnd,
    cltv_delta: 18,
    tokens: 1e5,
  });

  [cancelInvoice, claimInvoice].forEach(({request}) => {
    return payViaPaymentRequest({request, lnd: cluster.target.lnd}, () => {});
  });

  const waitForHold = id => new Promise((resolve, reject) => {
    const subInvoice = subscribeToInvoice({id, lnd});

    subInvoice.on('invoice_updated', n => !n.is_held ? null : resolve());

    return;
  });

  await all([cancelInvoice, claimInvoice].map(({id}) => waitForHold(id)));

  await closeChannel({
    lnd,
    is_force_close: true,
    transaction_id: toForceClose.transaction_id,
    transaction_vout: toForceClose.transaction_vout,
  });

  await settleHodlInvoice({lnd, secret: claimInvoice.secret});

  // LND 0.12.0 requires a delay before sweeps start
  await delay(1000 * 35);

  // Wait for channel to close
  await asyncRetry({interval, times}, async () => {
    const closedChannels = await getClosedChannels({lnd});

    await cluster.generate({count: 1});

    if (closedChannels.channels.length < 2) {
      throw new Error('ExpectedClosedChannel');
    }
  });

  const targetChannels = await getClosedChannels({lnd: cluster.target.lnd});

  const [, control] = (await getClosedChannels({lnd})).channels;

  // Wait for target channel
  await asyncRetry({interval, times}, async () => {
    const targetChans = await getClosedChannels({lnd: cluster.target.lnd});

    if (targetChans.channels.length < 2) {
      throw new Error('ExpectedClosedTargetChannel');
    }
  });

  const [, target] = targetChannels.channels;

  equal(control.close_balance_vout !== undefined, true, 'Has balance vout');
  equal(!!control.close_balance_spent_by, true, 'Has close balance spend');
  equal(control.close_payments.length, 3, 'Has all close payments');

  if (!!target) {
    equal(target.close_balance_vout !== undefined, true, 'target vout coins');
    equal(!!target.close_balance_spent_by, true, 'Target close balance spend');
    equal(target.close_payments.length, 2, 'Target close payments present');
  }

  const controlCloseId = control.close_transaction_id;

  const controlTimedOut = control.close_payments.find(n => n.is_refunded);
  const controlPending = control.close_payments.find(n => n.is_pending);

  const controlPaid = control.close_payments.find(payment => {
    return payment.transaction_id === controlPending.spent_by;
  });

  // LND 0.11.1 and below do not use anchors
  if (!isAnchors) {
    equal(controlTimedOut.tokens, 91213, 'Timed out has token count');
    equal(controlTimedOut.is_outgoing, false, 'Timeout is incoming payment');
    equal(controlTimedOut.is_paid, false, 'Timed out payment is not paid');
    equal(controlTimedOut.is_pending, false, 'Timed out payment is not paid');
    equal(controlTimedOut.is_refunded, true, 'Timed out payment is refunded');
    equal(controlTimedOut.spent_by, undefined, 'Timed out has no spent by');
    equal(!!controlTimedOut.transaction_id, true, 'Timed out has tx id');
    equal(controlTimedOut.transaction_vout !== undefined, true, 'Refund vout');
  }

  equal(controlPending.is_outgoing, false, 'Pending is incoming payment');
  equal(controlPending.is_paid, false, 'Pending is not yet paid');
  equal(controlPending.is_pending, true, 'Pending is marked pending');
  equal(controlPending.is_refunded, false, 'Pending is not marked refunded');
  equal(!!controlPending.spent_by, true, 'Pending has spent by');
  equal(controlPending.tokens, 100000, 'Pending payment has tokens');
  equal(controlPending.transaction_id, controlCloseId, 'Pending off close');
  equal(controlPending.transaction_vout !== undefined, true, 'Pending vout');

  // LND 0.11.1 and below do not use anchors
  if (!isAnchors) {
    equal(controlTimedOut.tokens, 91213, 'Paid payment has token count');
  }

  equal(controlPaid.is_outgoing, false, 'Paid is incoming payment');
  equal(controlPaid.is_paid, true, 'Paid payment is paid');
  equal(controlPaid.is_pending, false, 'Paid payment is not pending');
  equal(controlPaid.is_refunded, false, 'Paid payment is not refunded');
  equal(!!controlPaid.spent_by, true, 'Paid payment has spent by');
  equal(!!controlPaid.transaction_id, true, 'Paid payment has tx id');
  equal(controlPaid.transaction_vout !== undefined, true, 'Paid tx vout');

  const targetCloseId = target.close_transaction_id;

  const targetTimedOut = target.close_payments.find(n => n.is_refunded);
  const targetPaid = target.close_payments.find(n => n.is_paid);

  equal(targetTimedOut.is_outgoing, true, 'Target refund is outgoing');
  equal(targetTimedOut.is_paid, false, 'Target refund is not paid');
  equal(targetTimedOut.is_pending, false, 'Target refund is not pending');
  equal(targetTimedOut.is_refunded, true, 'Target refund is refunded');
  equal(!!targetTimedOut.spent_by, true, 'Target refund has spent by');
  equal(targetTimedOut.tokens, 100000, 'Target refund has tokens');
  equal(targetTimedOut.transaction_id, targetCloseId, 'Target refund spend');
  equal(targetTimedOut.transaction_vout !== undefined, true, 'T Refund vout');

  equal(targetPaid.is_outgoing, true, 'Target paid is outgoing');
  equal(targetPaid.is_paid, true, 'Target paid is not paid');
  equal(targetPaid.is_pending, false, 'Target paid is not pending');
  equal(targetPaid.is_refunded, false, 'Target paid is refunded');
  equal(!!targetPaid.spent_by, true, 'Target paid has spent by');
  equal(targetPaid.tokens, 100000, 'Target paid has tokens');
  equal(targetPaid.transaction_id, targetCloseId, 'Target paid spend');
  equal(targetPaid.transaction_vout !== undefined, true, 'Target paid vout');

  await cluster.kill({});

  return end();
});
