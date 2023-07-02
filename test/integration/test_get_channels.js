const {ok} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getChannels} = require('./../../');
const {getWalletInfo} = require('./../../');

const anchorFeatureBit = 23;
const giveTokens = 1e5;
const remoteCsv = 40;
const size = 2;

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
