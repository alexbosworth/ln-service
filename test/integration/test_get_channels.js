const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {setupChannel} = require('./../macros');

const anchorFeatureBit = 23;
const giveTokens = 1e5;
const remoteCsv = 40;
const size = 2;

// Getting channels should return the list of channels
test(`Get channels`, async ({end, equal, ok}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  const chan = await setupChannel({
    generate,
    lnd,
    give: giveTokens,
    partner_csv_delay: remoteCsv,
    to: target,
  });

  const [channel] = (await getChannels({lnd})).channels;
  const {features} = await getWalletInfo({lnd});
  const [targetChan] = (await getChannels({lnd: target.lnd})).channels;

  const isAnchors = !!features.find(n => n.bit === anchorFeatureBit);

  equal(targetChan.is_partner_initiated, true, 'Self-init channel');

  if (!!channel.local_given) {
    equal(channel.local_given, giveTokens, 'Push tokens are reflected');
    equal(channel.remote_given, Number(), 'Push tokens are reflected');
  }

  if (!!channel.remote_given) {
    equal(channel.local_given, Number(), 'Push tokens are reflected');
    equal(channel.remote_given, giveTokens, 'Push tokens are reflected');
  }

  if (channel.remote_csv === remoteCsv) {
    equal(channel.local_csv, 144, 'Local CSV is returned');
    ok(channel.local_dust >= 354, 'Local dust limit is returned');
    equal(channel.local_max_htlcs, 483, 'Local max htlcs are returned');
    equal(channel.local_max_pending_mtokens, '990000000', 'Local max pending');
    equal(channel.local_min_htlc_mtokens, '1000', 'Local min HTLC mtokens');
    equal(channel.remote_csv, remoteCsv, 'Remote CSV is returned');
    ok(channel.remote_dust >= 354, 'Remote dust limit is returned');
    equal(channel.remote_max_htlcs, 483, 'Remote max htlcs are returned');
    equal(channel.remote_max_pending_mtokens, '990000000', 'Remote pending');
    equal(channel.remote_min_htlc_mtokens, '1', 'Remote min HTLC mtokens');
  }

  // LND 0.11.1 and below do not support anchor channels
  if (isAnchors) {
    equal(channel.local_balance, 896530, 'Local balance');
    equal(channel.commit_transaction_fee, 2810, 'Commit fee');
    equal(channel.commit_transaction_weight, 1116, 'Commit weight');
  } else {
    equal(channel.local_balance, 890950, 'Local balance');
    equal(channel.commit_transaction_fee, 9050, 'Commit fee');
    equal(channel.commit_transaction_weight, 724, 'Commit weight');
  }

  equal(channel.capacity, 1000000, 'Channel capacity');
  equal(channel.id, chan.id, 'Channel id returned');
  equal(channel.is_active, true, 'Channel active');
  equal(channel.is_closing, false, 'Channel not closing');
  equal(channel.is_opening, false, 'Channel not opening');
  equal(channel.is_partner_initiated, false, 'Partner initiated channel');
  equal(channel.is_private, false, 'Channel not private');
  equal(channel.local_reserve, 10000, 'Local reserve');
  equal(channel.partner_public_key, target.id, 'Pubkey');
  equal(channel.pending_payments.length, 0, 'No pending payments');
  equal(channel.received, 0, 'Channel received');
  equal(channel.remote_balance, 100000, 'Channel remote balance');
  equal(channel.remote_reserve, 10000, 'Remote reserve amount');
  equal(channel.sent, 0, 'Channel sent');
  equal(channel.transaction_id, chan.transaction_id, 'Chan funding tx id');
  equal(channel.transaction_vout, 0, 'Channel transactin vout');
  equal(channel.unsettled_balance, 0, 'Channel unsettled balance');

  await kill({});

  return end();
});
