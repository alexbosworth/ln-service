const {test} = require('tap');

const {createCluster} = require('./../macros');
const {getChannels} = require('./../../');
const {setupChannel} = require('./../macros');

const giveTokens = 1e5;

// Getting channels should return the list of channels
test(`Get channels`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {generate} = cluster;
  const {lnd} = cluster.control;

  const chan = await setupChannel({
    lnd,
    generate: cluster.generate,
    give: giveTokens,
    to: cluster.target,
  });

  const [channel] = (await getChannels({lnd})).channels;
  const [targetChan] = (await getChannels({lnd: cluster.target.lnd})).channels;

  equal(targetChan.is_partner_initiated, true, 'Self-init channel');

  if (!!channel.local_given) {
    equal(channel.local_given, giveTokens, 'Push tokens are reflected');
    equal(channel.remote_given, Number(), 'Push tokens are reflected');
  }

  if (!!channel.remote_given) {
    equal(channel.local_given, Number(), 'Push tokens are reflected');
    equal(channel.remote_given, giveTokens, 'Push tokens are reflected');
  }

  equal(channel.capacity, 1000000, 'Channel capacity');
  equal(channel.commit_transaction_fee, 9050, 'Commit fee');
  equal(channel.commit_transaction_weight, 724, 'Commit weight');
  equal(channel.id, chan.id, 'Channel id returned');
  equal(channel.is_active, true, 'Channel active');
  equal(channel.is_closing, false, 'Channel not closing');
  equal(channel.is_opening, false, 'Channel not opening');
  equal(channel.is_partner_initiated, false, 'Partner initiated channel');
  equal(channel.is_private, false, 'Channel not private');
  equal(channel.local_balance, 890950, 'Local balance');
  equal(channel.local_reserve, 10000, 'Local reserve');
  equal(channel.partner_public_key, cluster.target.public_key, 'Pubkey');
  equal(channel.pending_payments.length, 0, 'No pending payments');
  equal(channel.received, 0, 'Channel received');
  equal(channel.remote_balance, 100000, 'Channel remote balance');
  equal(channel.remote_reserve, 10000, 'Remote reserve amount');
  equal(channel.sent, 0, 'Channel sent');
  equal(channel.transaction_id, chan.transaction_id, 'Chan funding tx id');
  equal(channel.transaction_vout, 0, 'Channel transactin vout');
  equal(channel.unsettled_balance, 0, 'Channel unsettled balance');

  await cluster.kill({});

  return end();
});
