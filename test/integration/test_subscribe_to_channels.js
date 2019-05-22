const {test} = require('tap');

const addPeer = require('./../../addPeer');
const closeChannel = require('./../../closeChannel');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const openChannel = require('./../../openChannel');
const removePeer = require('./../../removePeer');
const {subscribeToChannels} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const giveTokens = 1e5;

// Subscribing to channels should trigger channel events
test('Subscribe to channels', async ({deepIs, end, equal, fail}) => {
  const expected = [];
  const cluster = await createCluster({});

  const {lnd} = cluster.control;
  const socket = `${cluster.target.listen_ip}:${cluster.target.listen_port}`;

  const sub = subscribeToChannels({lnd});

  sub.on('data', update => deepIs(update, expected.shift()));
  sub.on('end', () => {});
  sub.on('error', err => {});
  sub.on('status', () => {});

  // Create a channel from the control to the target node
  const channelOpen = await openChannel({
    lnd,
    socket,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: giveTokens,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
  });

  expected.push({
    capacity: channelCapacityTokens - defaultFee,
    commit_transaction_fee: 9050,
    commit_transaction_weight: 724,
    is_active: true,
    is_closing: false,
    is_opening: false,
    is_partner_initiated: false,
    is_private: false,
    local_balance: 889950,
    partner_public_key: cluster.target_node_public_key,
    pending_payments: [],
    received: 0,
    remote_balance: giveTokens,
    sent: 0,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
    type: 'channel',
    unsettled_balance: 0,
  });

  expected.push({
    is_active: true,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
    type: 'channel_status',
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.control});

  expected.push({
    is_active: false,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
    type: 'channel_status',
  });

  // Disconnect, reconnect the channel
  await removePeer({lnd, public_key: cluster.target_node_public_key});

  await cluster.generate({count: confirmationCount, node: cluster.control});

  expected.push({
    is_active: true,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
    type: 'channel_status',
  });

  await addPeer({lnd, socket, public_key: cluster.target_node_public_key});

  await delay(3000);

  await cluster.generate({count: confirmationCount, node: cluster.control});

  expected.push({
    is_active: false,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
    type: 'channel_status',
  });

  // Close the channel
  const channelClose = await closeChannel({
    lnd: cluster.control.lnd,
    tokens_per_vbyte: defaultFee,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  expected.push({
    capacity: channelCapacityTokens - defaultFee,
    close_confirm_height: 503,
    close_transaction_id: channelClose.transaction_id,
    final_local_balance: 889950,
    final_time_locked_balance: 0,
    id: '443x1x0',
    is_breach_close: false,
    is_cooperative_close: true,
    is_funding_cancel: false,
    is_local_force_close: false,
    is_remote_force_close: false,
    partner_public_key: cluster.target_node_public_key,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
    type: 'closed_channel' 
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await cluster.kill({});

  return;
});
