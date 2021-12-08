const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {closeChannel} = require('./../../');
const {getWalletInfo} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const anchorsFeatureBit = 23;
const defaultFee = 1e3;
const give = 1e4;
const size = 2;

// Getting pending channels should show pending channels
test(`Get pending channels`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  const {features} = await getWalletInfo({lnd});

  const isAnchors = !!features.find(n => n.bit === anchorsFeatureBit);

  // Target starts a channel with control
  const coopChan = await setupChannel({generate, give, lnd, to: target});

  // Target closes the channel
  const niceClose = await closeChannel({
    lnd: target.lnd,
    tokens_per_vbyte: defaultFee,
    transaction_id: coopChan.transaction_id,
    transaction_vout: coopChan.transaction_vout,
  });

  // Control views their pending channels
  const {channel} = await waitForPendingChannel({
    lnd,
    id: coopChan.transaction_id,
  });

  if (channel.is_partner_initiated !== undefined) {
    equal(channel.is_partner_initiated, false, 'Channel was initiated');
  }

  // LND 0.11.1 and below do not support anchor channels
  if (isAnchors) {
    equal(channel.local_balance, 986530, 'Original balance');
    equal(channel.pending_balance, 986530, 'Waiting on balance');
  } else {
    equal(channel.local_balance, 980950, 'Original balance');
    equal(channel.pending_balance, 980950, 'Waiting on balance');
  }

  equal(channel.capacity, 1000000, 'Got channel capacity');
  equal(channel.close_transaction_id, undefined, 'No close tx id');
  equal(channel.is_active, false, 'Ended');
  equal(channel.is_closing, true, 'Closing');
  equal(channel.is_opening, false, 'Not Opening');
  equal(channel.local_reserve, 10000, 'Local reserve');
  equal(channel.partner_public_key, target.id, 'Target public key');
  equal(channel.pending_payments, undefined, 'No pending payments');
  equal(channel.received, 0, 'Never received');
  equal(channel.recovered_tokens, undefined, 'Nothing to recover in sweep');
  equal(channel.remote_reserve, 10000, 'Remote reserve');
  equal(channel.sent, 0, 'Never sent anything');
  equal(channel.timelock_expiration, undefined, 'No timelock in coop mode');
  equal(channel.transaction_fee, null, 'No transaction fee data');
  equal(channel.transaction_id, coopChan.transaction_id, 'funding tx id');
  equal(channel.transaction_vout, coopChan.transaction_vout, 'funding vout');
  equal(channel.transaction_weight, null, 'No funding tx weight data');

  if (!!channel.remote_balance) {
    equal(channel.remote_balance, give, 'Opposing channel balance');
  }

  await kill({});

  return end();
});
