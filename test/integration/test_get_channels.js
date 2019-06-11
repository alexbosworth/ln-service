const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getPendingChannels} = require('./../../');
const {openChannel} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const confirmationCount = 20;
const maxChannelCapacity = 16776215;

// Getting channels should return the list of channels
test(`Get channels`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const chanOpen = await openChannel({
    lnd,
    local_tokens: maxChannelCapacity,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({lnd, id: chanOpen.transaction_id});

  await cluster.generate({count: confirmationCount});

  await waitForChannel({lnd, id: chanOpen.transaction_id});

  const pending = await getPendingChannels({lnd});

  const {channels} = await getChannels({lnd});

  const [channel] = channels;

  const target = await getChannels({lnd: cluster.target.lnd});

  const [targetChan] = target.channels;

  if (targetChan.is_partner_initiated !== undefined) {
    equal(targetChan.is_partner_initiated, false, 'Self-init channel');
  }

  equal(channel.capacity, maxChannelCapacity, 'Channel capacity');
  equal(channel.is_active, true, 'Channel active');
  equal(channel.is_closing, false, 'Channel not closing');
  equal(channel.is_opening, false, 'Channel not opening');
  equal(channel.is_private, false, 'Channel not private');
  equal(channel.partner_public_key, cluster.target_node_public_key, 'Pubkey');
  equal(channel.received, 0, 'Channel received');
  equal(channel.remote_balance, 0, 'Channel remote balance');
  equal(channel.sent, 0, 'Channel sent');
  equal(channel.transaction_vout, 0, 'Channel transactin vout');
  equal(channel.unsettled_balance, 0, 'Channel unsettled balance');

  await cluster.kill({});

  return end();
});
