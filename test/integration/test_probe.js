const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getRoutes} = require('./../../');
const {probe} = require('./../../');
const {setupChannel} = require('./../macros');

const channelCapacityTokens = 1e6;

// Probing for a route should return a route
test('Probe', async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  // The probe will go from control > target > remote
  const controlChannel = await setupChannel({
    lnd,
    capacity: channelCapacityTokens * 2,
    generate: cluster.generate,
    to: cluster.target,
  });

  // Target to remote channel will have too-few tokens to forward
  const remoteChannel = await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    give: Math.round(channelCapacityTokens / 2),
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  const invoice = await createInvoice({
    lnd: cluster.remote.lnd,
    tokens: Math.round(channelCapacityTokens / 2),
  });

  await delay(1000);

  // A route will exist because control doesn't know the target>remote balance
  const {routes} = await getRoutes({
    lnd,
    destination: cluster.remote_node_public_key,
    tokens: invoice.tokens,
  });

  const probeResults = await probe({lnd, routes, tokens: invoice.tokens});

  // At target>remote there is a temporary channel failure due to liquidity
  equal(probeResults.temporary_failures.length, 1, 'Fails due to imbalance');

  const [fail] = probeResults.temporary_failures;

  equal(fail.public_key, cluster.remote_node_public_key, 'Fails to remote');
  equal(fail.channel, remoteChannel.id, 'Fails in target <> remote channel');

  // Create a new channel to increase target>remote total edge liquidity
  await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  const success = await probe({lnd, routes, tokens: invoice.tokens});

  // Now the payment can be completed successfully and a probe shows that
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
