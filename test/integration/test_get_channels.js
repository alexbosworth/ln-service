const {deepStrictEqual} = require('node:assert').strict;
const {ok} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {cancelHodlInvoice} = require('./../../');
const {createHodlInvoice} = require('./../../');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getInvoice} = require('./../../');
const {getWalletInfo} = require('./../../');
const {subscribeToPayViaRequest} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const anchorFeatureBit = 23;
const capacity = 1e6;
const firstHtlcIndex = 0;
const giveTokens = 1e5;
const interval = 100;
const remoteCsv = 40;
const size = 2;
const times = 1000;
const tokens = 100;

// Getting channels should return the list of channels
test(`Get channels`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  const chan = await setupChannel({
    generate,
    lnd,
    give_tokens: giveTokens,
    partner_csv_delay: remoteCsv,
    to: target,
  });

  const [channel] = (await getChannels({lnd})).channels;
  const {features} = await getWalletInfo({lnd});
  const [targetChan] = (await getChannels({lnd: target.lnd})).channels;

  strictEqual(targetChan.is_partner_initiated, true, 'Self-init channel');

  if (!!channel.local_given) {
    strictEqual(channel.local_given, giveTokens, 'Push tokens are reflected');
    strictEqual(channel.remote_given, Number(), 'Push tokens are reflected');
  }

  if (!!channel.remote_given) {
    strictEqual(channel.local_given, Number(), 'Push tokens are reflected');
    strictEqual(channel.remote_given, giveTokens, 'Push tokens are reflected');
  }

  if (channel.remote_csv === remoteCsv) {
    strictEqual(channel.local_csv, 144, 'Local CSV is returned');
    ok(channel.local_dust >= 354, 'Local dust limit is returned');
    strictEqual(channel.local_max_htlcs, 483, 'Local max htlcs are returned');
    strictEqual(channel.local_max_pending_mtokens, '990000000', 'Local max');
    strictEqual(channel.local_min_htlc_mtokens, '1000', 'Local min mtokens');
    strictEqual(channel.remote_csv, remoteCsv, 'Remote CSV is returned');
    ok(channel.remote_dust >= 354, 'Remote dust limit is returned');
    strictEqual(channel.remote_max_htlcs, 483, 'Remote max htlcs returned');
    strictEqual(channel.remote_max_pending_mtokens, '990000000', 'Remote');
    strictEqual(channel.remote_min_htlc_mtokens, '1', 'Remote min HTLC');
  }

  strictEqual(channel.capacity, 1000000, 'Channel capacity');
  strictEqual(channel.commit_transaction_fee, 2810, 'Commit fee');
  strictEqual(channel.commit_transaction_weight, 1116, 'Commit weight');
  strictEqual(channel.id, chan.id, 'Channel id returned');
  strictEqual(channel.is_active, true, 'Channel active');
  strictEqual(channel.is_closing, false, 'Channel not closing');
  strictEqual(channel.is_opening, false, 'Channel not opening');
  strictEqual(channel.is_partner_initiated, false, 'Partner made channel');
  strictEqual(channel.is_private, false, 'Channel not private');
  strictEqual(channel.local_balance, 896530, 'Local balance');
  strictEqual(channel.local_reserve, 10000, 'Local reserve');
  strictEqual(channel.partner_public_key, target.id, 'Pubkey');
  strictEqual(channel.pending_payments.length, 0, 'No pending payments');
  strictEqual(channel.received, 0, 'Channel received');
  strictEqual(channel.remote_balance, 100000, 'Channel remote balance');
  strictEqual(channel.remote_reserve, 10000, 'Remote reserve amount');
  strictEqual(channel.sent, 0, 'Channel sent');
  strictEqual(channel.transaction_id, chan.transaction_id, 'Chan funding tx');
  strictEqual(channel.transaction_vout, 0, 'Channel transactin vout');
  strictEqual(channel.type, 'anchor', 'Channel type is returned');
  strictEqual(channel.unsettled_balance, 0, 'Channel unsettled balance');

  await kill({});

  return;
});

// Getting channels should return pending payments, including first HTLCs
test(`Get channels with pending payments`, async () => {
  const {kill, nodes} = await spawnLightningCluster({capacity, size: 3});

  const [control, target, remote] = nodes;

  const subs = [];

  try {
    await addPeer({
      lnd: control.lnd,
      public_key: remote.id,
      socket: remote.socket,
    });

    const {routes} = await waitForRoute({
      tokens,
      destination: remote.id,
      lnd: control.lnd,
    });

    const [route] = routes;

    // Hold a payment open so that there are HTLCs on every channel
    const invoice = await createHodlInvoice({tokens, lnd: remote.lnd});

    const sub = subscribeToPayViaRequest({
      lnd: control.lnd,
      request: invoice.request,
    });

    subs.push(sub);

    sub.on('error', () => {});

    await asyncRetry({interval, times}, async () => {
      const {is_held} = await getInvoice({id: invoice.id, lnd: remote.lnd});

      if (!is_held) {
        throw new Error('ExpectedPaymentHeldAtRemote');
      }
    });

    const {current_block_height} = await getHeight({lnd: control.lnd});

    // Wait for every node to reflect the held HTLC on its channels
    const [controlChans, targetChans, remoteChans] = await asyncRetry({
      interval,
      times,
    },
    async () => {
      const lists = await Promise.all(nodes.map(async ({lnd}) => {
        return (await getChannels({lnd})).channels;
      }));

      const [, targetList] = lists;

      const pending = [].concat(...lists).map(n => n.pending_payments);

      if (pending.filter(n => n.length === 1).length !== 4) {
        throw new Error('ExpectedPendingPaymentsOnAllChannels');
      }

      // The forwarding node needs to know about both sides of the forward
      if (targetList.find(n => !n.pending_payments[0].is_forward)) {
        throw new Error('ExpectedForwardingDetailsOnTargetHtlcs');
      }

      return lists;
    });

    const [controlChannel] = controlChans;
    const [remoteChannel] = remoteChans;

    const targetIn = targetChans.find(n => n.id === controlChannel.id);
    const targetOut = targetChans.find(n => n.id === remoteChannel.id);

    strictEqual(controlChans.length, 1, 'Control has a channel with target');
    strictEqual(remoteChans.length, 1, 'Remote has a channel with target');
    strictEqual(!!targetIn, true, 'Target has channel with control');
    strictEqual(!!targetOut, true, 'Target has channel with remote');

    const [controlHtlc] = controlChannel.pending_payments;
    const [remoteHtlc] = remoteChannel.pending_payments;
    const [targetInHtlc] = targetIn.pending_payments;
    const [targetOutHtlc] = targetOut.pending_payments;

    // Timeouts are set by the payment, so only check they are in the future
    [controlHtlc, remoteHtlc, targetInHtlc, targetOutHtlc].forEach(htlc => {
      ok(htlc.timeout > current_block_height, 'HTLC has a timeout height');
    });

    // The first HTLC on a channel has index zero, it should not be dropped
    deepStrictEqual(
      controlHtlc,
      {
        id: invoice.id,
        in_channel: undefined,
        in_payment: undefined,
        is_forward: undefined,
        is_outgoing: true,
        out_channel: undefined,
        out_payment: undefined,
        payment: firstHtlcIndex,
        timeout: controlHtlc.timeout,
        tokens: route.tokens,
      },
      'Sender has an outgoing HTLC with the first HTLC index'
    );

    deepStrictEqual(
      targetInHtlc,
      {
        id: invoice.id,
        in_channel: undefined,
        in_payment: undefined,
        is_forward: true,
        is_outgoing: false,
        out_channel: remoteChannel.id,
        out_payment: firstHtlcIndex,
        payment: firstHtlcIndex,
        timeout: targetInHtlc.timeout,
        tokens: route.tokens,
      },
      'Forwarder has an incoming HTLC forwarding to the first outbound HTLC'
    );

    deepStrictEqual(
      targetOutHtlc,
      {
        id: invoice.id,
        in_channel: controlChannel.id,
        in_payment: firstHtlcIndex,
        is_forward: true,
        is_outgoing: true,
        out_channel: undefined,
        out_payment: undefined,
        payment: firstHtlcIndex,
        timeout: targetOutHtlc.timeout,
        tokens,
      },
      'Forwarder has an outgoing HTLC forwarded from the first inbound HTLC'
    );

    deepStrictEqual(
      remoteHtlc,
      {
        id: invoice.id,
        in_channel: undefined,
        in_payment: undefined,
        is_forward: undefined,
        is_outgoing: false,
        out_channel: undefined,
        out_payment: undefined,
        payment: firstHtlcIndex,
        timeout: remoteHtlc.timeout,
        tokens,
      },
      'Receiver has an incoming HTLC with the first HTLC index'
    );

    await cancelHodlInvoice({id: invoice.id, lnd: remote.lnd});
  } finally {
    subs.forEach(n => n.removeAllListeners());

    await kill({});
  }

  return;
});
