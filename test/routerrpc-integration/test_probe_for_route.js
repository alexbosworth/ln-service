const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {deleteForwardingReputations} = require('./../../');
const {getFailedPayments} = require('./../../');
const {getWalletVersion} = require('./../../');
const {payViaRoutes} = require('./../../');
const {probeForRoute} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {setupChannel} = require('./../macros');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const tokens = 1e6 / 2;

// Probing for a route should return a route
test('Probe for route', async ({end, equal, strictSame}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const {address} = await createChainAddress({
    format: 'p2wpkh',
    lnd: cluster.remote.lnd,
  });

  // Send coins to remote so that it can accept the channel
  await sendToChainAddress({lnd, address, tokens: channelCapacityTokens})
  // Generate to confirm the tx
  await cluster.generate({count: confirmationCount, node: cluster.control});
  await cluster.generate({count: confirmationCount, node: cluster.remote});

  await setupChannel({
    lnd,
    capacity: channelCapacityTokens + channelCapacityTokens,
    generate: cluster.generate,
    to: cluster.target,
  });

  await setupChannel({
    capacity: channelCapacityTokens,
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    give: Math.round(channelCapacityTokens / 2),
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

  await delay(1000);

  try {
    await probeForRoute({
      lnd,
      destination: cluster.remote_node_public_key,
      is_ignoring_past_failures: true,
      tokens: invoice.tokens,
    });
  } catch (err) {
    const [code, message, {failure}] = err;

    equal(code, 503, 'Failed to find route');
    equal(message, 'RoutingFailure', 'Hit a routing failure');
    equal(failure.reason, 'TemporaryChannelFailure', 'Temporary failure');
  }

  const {version} = await getWalletVersion({lnd});

  const [, minor] = (version || '').split('.');

  if (!version || parseInt(minor) > 13) {
    const {payments} = await getFailedPayments({lnd});

    strictSame(payments, [], 'Probes do not leave a failed state behind');
  }

  // Create a new channel to increase total edge liquidity
  await setupChannel({
    capacity: channelCapacityTokens,
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    to: cluster.remote,
  });

  await deleteForwardingReputations({lnd});

  try {
    const {route} = await probeForRoute({
      lnd,
      destination: cluster.remote.public_key,
      payment: invoice.payment,
      tokens: invoice.tokens,
      total_mtokens: !!invoice.payment ? invoice.mtokens : undefined,
    });

    if (!route) {
      throw new Error('ExpectedRouteFromProbe');
    }

    equal(route.fee, 1, 'Found route fee');
    equal(route.fee_mtokens, '1500', 'Found route fee mtokens');
    strictSame(route.hops.length, 2, 'Found route hops returned');
    equal(route.mtokens, '500001500', 'Found route mtokens');
    equal(route.timeout, 586, 'Found route timeout');
    equal(route.tokens, 500001, 'Found route tokens');

    const {secret} = await payViaRoutes({
      lnd,
      id: invoice.id,
      routes: [route],
    });

    equal(secret, invoice.secret, 'Route works');
  } catch (err) {
    equal(err, null, 'No error when probing for route');
  }

  await cluster.kill({});

  return end();
});
