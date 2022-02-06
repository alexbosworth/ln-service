const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {getNetworkGraph} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {probeForRoute} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const flatten = arr => [].concat(...arr);
const interval = 10;
const size = 3;
const times = 1000;
const tlvOnionBit = 14;
const tokens = 1e6 / 2;

// Deleting forwarding reputations should eliminate forwarding reputations
test('Delete forwarding reputations', async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  try {
    const controlToTargetChan = await setupChannel({
      generate,
      lnd,
      to: target,
    });

    const targetToRemoteChan = await setupChannel({
      generate: target.generate,
      lnd: target.lnd,
      to: remote,
    });

    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    const {id, request} = await createInvoice({tokens, lnd: remote.lnd});

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

    await waitForRoute({lnd, tokens, destination: remote.id});

    try {
      await payViaPaymentRequest({lnd, request});
    } catch (err) {
      equal(err, null, 'Expected no error paying payment request');
    }

    try {
      await probeForRoute({lnd, tokens, destination: remote.id});
    } catch (err) {}

    {
      const {nodes} = await getForwardingReputations({lnd});

      equal(nodes.length, 2, 'Reputations should exist');
    }

    await deleteForwardingReputations({lnd});

    {
      const {nodes} = await getForwardingReputations({lnd});

      equal(nodes.length, [].length, 'Reputations should be wiped');
    }
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return end();
});
