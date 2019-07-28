const {test} = require('tap');

const {closeChannel} = require('./../../');
const {createCluster} = require('./../macros');
const {getChannels} = require('./../../');
const {getPendingChannels} = require('./../../');
const {openChannel} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultVout = 0;
const giftTokens = 1e4;
const spendableRatio = 0.99;

// Getting pending channels should show pending channels
test(`Get pending channels`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const coopChan = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: giftTokens,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({lnd, id: coopChan.transaction_id});

  await cluster.generate({count: confirmationCount});

  await waitForChannel({lnd, id: coopChan.transaction_id});

  const niceClose = await closeChannel({
    lnd: cluster.target.lnd,
    public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
    tokens_per_vbyte: defaultFee,
    transaction_id: coopChan.transaction_id,
    transaction_vout: coopChan.transaction_vout,
  });

  const {channel} = await waitForPendingChannel({
    lnd: cluster.control.lnd,
    id: coopChan.transaction_id,
  });

  equal(channel.is_active, false, 'Ended');
  equal(channel.is_closing, true, 'Closing');
  equal(channel.is_opening, false, 'Not Opening');
  equal(channel.local_balance, 980950, 'Original balance');
  equal(channel.partner_public_key, cluster.target_node_public_key, 'pubk');
  equal(channel.pending_balance, 980950, 'Waiting on balance');
  equal(channel.received, 0, 'Never received');
  equal(channel.recovered_tokens, undefined, 'Nothing to recover in sweep');
  equal(channel.remote_balance, 0, 'Opposing channel balance nil');
  equal(channel.sent, 0, 'Never sent anything');
  equal(channel.timelock_expiration, undefined, 'No timelock in coop mode');
  equal(channel.transaction_id, coopChan.transaction_id, 'funding tx id');
  equal(channel.transaction_vout, coopChan.transaction_vout, 'funding vout');

  await cluster.kill({});

  return end();
});
