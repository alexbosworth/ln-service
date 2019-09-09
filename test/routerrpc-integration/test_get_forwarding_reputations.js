const {once} = require('events');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {getRoutes} = require('./../../');
const {openChannel} = require('./../../');
const {payViaRoutes} = require('./../../');
const {probeForRoute} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultOdds = 950000;
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
    socket: cluster.remote.socket,
  });

  const {channels} = await getChannels({lnd: cluster.remote.lnd});

  await createInvoice({tokens, lnd: cluster.remote.lnd});

  await delay(3000);

  try {
    const res = await probeForRoute({
      lnd,
      tokens,
      destination: cluster.remote.public_key,
      is_ignoring_past_failures: true,
    });
  } catch (err) {
    equal(err, null, 'Expected no error probing');
  }

  const {nodes} = await getForwardingReputations({lnd});

  const [node] = nodes;

  equal(node.public_key, cluster.target.public_key, 'Temp fail node added');

  if (!!node.channels.length) {
    const [channel] = node.channels;

    equal(node.general_success_odds, defaultOdds, 'Node odds are default');
    equal(node.last_failed_forward_at, undefined, 'No last forward set');

    equal(channel.id, targetToRemoteChan.id, 'Fail channel id returned');
    equal(!!channel.last_failed_forward_at, true, 'Last fail time returned');
    equal(channel.min_relevant_tokens, tokens, 'Min relevant tokens set');
    equal(channel.success_odds < 1000, true, 'Success odds returned');
  } else {
    const [peer] = node.peers;

    equal(!!peer.last_failed_forward_at, true, 'Last fail time returned');
    equal(!!peer.success_odds, true, 'Peer success odds returned');
    equal(!!peer.to_public_key, true, 'Got peer pub key');
  }

  await cluster.kill({});

  return end();
});
