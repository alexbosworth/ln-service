const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {getChainBalance} = require('./../../');
const {getFailedPayments} = require('./../../');
const {getWalletInfo} = require('./../../');
const {getWalletVersion} = require('./../../');
const {payViaRoutes} = require('./../../');
const {probeForRoute} = require('./../../');
const {sendToChainAddress} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const count = 100;
const defaultFee = 1e3;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const interval = 50;
const size = 3;
const times = 1000;
const tokens = 1e6 / 2;

// Probing for a route should return a route
test('Probe for route', async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  try {
    // Send coins to remote so that it can accept a channel
    await remote.generate({count});

    await asyncRetry({interval, times}, async () => {
      const wallet = await getWalletInfo({lnd: remote.lnd});

      await remote.generate({});

      if (!wallet.is_synced_to_chain) {
        throw new Error('NotSyncedToChain');
      }
    });

    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    await setupChannel({
      generate,
      lnd,
      capacity: channelCapacityTokens + channelCapacityTokens,
      to: target,
    });

    await setupChannel({
      capacity: channelCapacityTokens,
      lnd: target.lnd,
      generate: target.generate,
      give_tokens: Math.round(channelCapacityTokens / 2),
      to: remote,
    });

    const invoice = await createInvoice({tokens, lnd: remote.lnd});

    await delay(1000);

    try {
      await probeForRoute({
        lnd,
        destination: remote.id,
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

      deepEqual(payments, [], 'Probes do not leave a failed state behind');
    }

    // Create a new channel to increase total edge liquidity
    await setupChannel({
      capacity: channelCapacityTokens,
      lnd: target.lnd,
      generate: target.generate,
      to: remote,
    });

    await deleteForwardingReputations({lnd});

    await waitForRoute({lnd, destination: remote.id, tokens: invoice.tokens});

    try {
      const {route} = await probeForRoute({
        lnd,
        destination: remote.id,
        payment: invoice.payment,
        tokens: invoice.tokens,
        total_mtokens: !!invoice.payment ? invoice.mtokens : undefined,
      });

      if (!route) {
        throw new Error('ExpectedRouteFromProbe');
      }

      equal(route.fee, 1, 'Found route fee');
      equal(route.fee_mtokens, '1500', 'Found route fee mtokens');
      deepEqual(route.hops.length, 2, 'Found route hops returned');
      equal(route.mtokens, '500001500', 'Found route mtokens');
      equal(route.timeout >= 400, true, 'Found route timeout');
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
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return;
});
