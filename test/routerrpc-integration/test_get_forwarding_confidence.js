const {once} = require('events');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getForwardingConfidence} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {getRouteConfidence} = require('./../../');
const {getRoutes} = require('./../../');
const {openChannel} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {payViaRoutes} = require('./../../');
const {probeForRoute} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const tokens = 1e6 / 2;

// Getting forwarding confidence should return confidence score
test('Get forwarding confidence', async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens * 2,
    partner_public_key: cluster.target_node_public_key,
    socket: cluster.target.socket,
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

  try {
    await getForwardingConfidence({
      lnd,
      from: cluster.target.public_key,
      mtokens: '1',
      to: cluster.remote.public_key,
    });
  } catch (err) {
    const [, code] = err;

    equal(code, 'QueryProbabilityNotImplemented', 'Not implemented error');

    await cluster.kill({});

    return end();
  }

  const [controlChannel] = (await getChannels({lnd})).channels;

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: Math.round(channelCapacityTokens / 2),
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: cluster.remote.socket,
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
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket
  });

  const destination = cluster.remote.public_key;

  // Allow time for graph sync to complete
  await waitForRoute({destination, lnd, tokens});

  try {
    await probeForRoute({
      destination,
      lnd,
      tokens,
      is_ignoring_past_failures: true,
    });
  } catch (err) {}

  const {nodes} = await getForwardingReputations({lnd});

  equal(nodes.length > 0, true, 'Reputation should be generated');

  const {routes} = await getRoutes({destination, lnd, tokens});

  equal(routes.length, 1, 'There should be a route');

  if (!!routes.length) {
    const [{hops}] = routes;

    const [from, to] = hops;

    const successHop = await getForwardingConfidence({
      lnd,
      from: cluster.control.public_key,
      mtokens: '1',
      to: cluster.target.public_key,
    });

    equal(successHop.confidence, 950000, 'High confidence in A -> B');
    equal(!!successHop.past_success_at, true, 'Past success date returned');

    const failedHop = await getForwardingConfidence({
      lnd,
      from: cluster.target.public_key,
      mtokens: from.forward_mtokens,
      to: cluster.remote.public_key,
    });

    equal(failedHop.confidence < 1e3, true, 'Low confidence in B -> C');
    equal(!!failedHop.past_failure_at, true, 'Past failure date returned');
    equal(failedHop.past_failure_tokens, 500000, 'Past failed tokens');
  }

  await cluster.kill({});

  return end();
});
