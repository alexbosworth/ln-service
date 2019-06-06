const {once} = require('events');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const {delay} = require('./../macros');
const getChannel = require('./../../getChannel');
const getChannels = require('./../../getChannels');
const getRoutes = require('./../../getRoutes');
const openChannel = require('./../../openChannel');
const payViaRoutes = require('./../../payViaRoutes');
const probeForRoute = require('./../../probeForRoute');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const tokens = 1e6 / 2;

// Probing for a route should return a route
test('Probe for route', async ({deepIs, end, equal}) => {
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

  const controlToTargetChan = await waitForChannel({
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

  const targetToRemoteChan = await waitForChannel({
    id: targetToRemoteChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  const {channels} = await getChannels({lnd: cluster.remote.lnd});

  const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

  await delay(1000);

  try {
    await probeForRoute({
      lnd,
      destination: cluster.remote_node_public_key,
      tokens: invoice.tokens,
    });
  } catch (err) {
    const [code, message, {failure}] = err;

    equal(code, 503, 'Failed to find route');
    equal(message, 'RoutingFailure', 'Hit a routing failure');
    equal(failure.reason, 'TemporaryChannelFailure', 'Temporary failure');
  }

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

  const bigChannel = await waitForChannel({
    id: newChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  const {route} = await probeForRoute({
    lnd,
    destination: cluster.remote_node_public_key,
    tokens: invoice.tokens,
  });

  equal(route.fee, 1, 'Found route fee');
  equal(route.fee_mtokens, '1500', 'Found route fee mtokens');
  deepIs(route.hops.length, 2, 'Found route hops returned');
  equal(route.mtokens, '500001500', 'Found route mtokens');
  equal(route.timeout, 582, 'Found route timeout');
  equal(route.tokens, 500001, 'Found route tokens');

  const {secret} = await payViaRoutes({lnd, id: invoice.id, routes: [route]});

  equal(secret, invoice.secret, 'Route works');

  await cluster.kill({});

  return end();
});
