const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {payViaRoutes} = require('./../../');
const {probeForRoute} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultOdds = 950000;
const interval = 250;
const times = 100;
const tokens = 1e6 / 2;

// Getting forwarding reputations should return reputations
test('Get forwarding reputations', async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  await setupChannel({
    lnd,
    capacity: channelCapacityTokens * 2,
    generate: cluster.generate,
    to: cluster.target,
  });

  const targetToRemoteChan = await setupChannel({
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

  const {channels} = await getChannels({lnd: cluster.remote.lnd});

  await createInvoice({tokens, lnd: cluster.remote.lnd});

  await waitForRoute({lnd, tokens, destination: cluster.remote.public_key});

  await asyncRetry({interval, times}, async () => {
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

    equal(!!node.public_key, true, 'Temp fail node added');

    const [peer] = node.peers;

    if (!peer.last_failed_forward_at) {
      throw new Error('ExpectedLastFailTimeReturned');
    }

    equal(!!peer.last_failed_forward_at, true, 'Last fail time returned');
    equal(!!peer.to_public_key, true, 'Got peer pub key');
  });

  await cluster.kill({});

  return end();
});
