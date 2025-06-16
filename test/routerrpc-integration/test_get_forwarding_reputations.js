const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {getChannels} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {getNetworkGraph} = require('./../../');
const {probeForRoute} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultOdds = 950000;
const flatten = arr => [].concat(...arr);
const interval = 10;
const maturity = 100;
const size = 3;
const times = 2000;
const tlvOnionBit = 14;
const tokens = 1e6 / 2;

// Getting forwarding reputations should return reputations
test('Get forwarding reputations', async () => {
  const cluster = await spawnLightningCluster({size});

  const [{generate, id, lnd}, target, remote] = cluster.nodes;

  try {
    await generate({count: maturity});

    // Create a channel from the control to the target node
    await setupChannel({
      generate,
      lnd,
      capacity: channelCapacityTokens * 2,
      to: target,
    });

    const targetToRemoteChan = await setupChannel({
      generate: target.generate,
      give_tokens: Math.round(channelCapacityTokens / 2),
      lnd: target.lnd,
      to: remote,
    });

    await asyncRetry({interval, times}, async () => {
      const {channels, nodes} = await getNetworkGraph({lnd});

      const limitedFeatures = nodes.find(node => {
        return !node.features.find(n => n.bit === tlvOnionBit);
      });

      const policies = flatten(channels.map(n => n.policies));

      const cltvDeltas = policies.map(n => n.cltv_delta);

      if (!!cltvDeltas.filter(n => !n).length) {
        throw new Error('ExpectedAllChannelPolicies');
      }

      if (!!limitedFeatures) {
        throw new Error('NetworkGraphSyncIncomplete');
      }
    });

    await asyncRetry({interval, times}, async () => {
      await deleteForwardingReputations({lnd});

      await generate({});

      await addPeer({
        lnd,
        public_key: remote.id,
        socket: remote.socket,
        retry_count: 1,
        retry_delay: 1,
        timeout: 1,
      });

      const {channels} = await getChannels({lnd: remote.lnd});

      await waitForRoute({lnd, tokens, destination: remote.id});

      await probeForRoute({
        lnd,
        tokens,
        destination: remote.id,
        is_ignoring_past_failures: true,
      });

      const {nodes} = await getForwardingReputations({lnd});

      const [node] = nodes;

      if (!node) {
        throw new Error('ExpectedForwardingNode');
      }

      equal(!!node.public_key, true, 'Temp fail node added');

      const [peer] = node.peers;

      if (!peer) {
        throw new Error('ExpectedNodePeer');
      }

      if (!peer.last_failed_forward_at) {
        throw new Error('ExpectedLastFailTimeReturned');
      }

      equal(!!peer.last_failed_forward_at, true, 'Last fail time returned');
      equal(!!peer.to_public_key, true, 'Got peer pub key');
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await cluster.kill({});

  return;
});
