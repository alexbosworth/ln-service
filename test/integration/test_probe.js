const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getRoutes} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {probe} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;

// Probing for a route should return a route
test('Probe', async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens * 2,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await waitForChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  const [controlChannel] = (await getChannels({lnd})).channels;

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: Math.round(channelCapacityTokens / 2),
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await waitForPendingChannel({
    id: targetToRemoteChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.target});

  await waitForChannel({
    id: targetToRemoteChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  const {channels} = await getChannels({lnd: cluster.remote.lnd});

  const invoice = await createInvoice({
    lnd: cluster.remote.lnd,
    tokens: Math.round(channelCapacityTokens / 2),
  });

  await delay(1000);

  const {routes} = await getRoutes({
    lnd,
    destination: cluster.remote_node_public_key,
    tokens: invoice.tokens,
  });

  const probeResults = await probe({lnd, routes, tokens: invoice.tokens});

  equal(probeResults.temporary_failures.length, 1, 'Fails due to imbalance');

  const [fail] = probeResults.temporary_failures;
  const [remoteChannel] = channels;

  equal(fail.public_key, cluster.remote_node_public_key, 'Fails to remote');
  equal(fail.channel, remoteChannel.id, 'Fails in target <> remote channel');

  // Create a new channel to increase total edge liquidity

  const newChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await waitForPendingChannel({
    id: newChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.target});

  await waitForChannel({
    id: newChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  const success = await probe({lnd, routes, tokens: invoice.tokens});

  const [hop1, hop2] = success.successes;

  equal(!!success.route, true, 'A route is found');
  equal(success.generic_failures.length, [].length, 'No generic failures');
  equal(success.stuck.length, [].length, 'No stuck htlcs');
  equal(hop1.channel, controlChannel.id, 'First success through control');
  equal(hop1.public_key, cluster.target_node_public_key, 'First to target');
  equal(hop2.channel, remoteChannel.id, 'Second success through target');
  equal(hop2.public_key, cluster.remote_node_public_key, 'Then to remote');
  equal(success.temporary_failures.length, [].length, 'No temp failures');

  await cluster.kill({});

  return end();
});
