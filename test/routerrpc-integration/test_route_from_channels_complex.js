const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getHeight} = require('./../../');
const {getChannel} = require('./../../');
const {getNode} = require('./../../');
const {getRouteThroughHops} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {getWalletInfo} = require('./../../');
const {payViaRoutes} = require('./../../');
const {routeFromChannels} = require('./../../');
const {updateRoutingFees} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const baseFee = '1000';
const confirmationCount = 6;
const discount = '1000';
const interval = 10;
const size = 5;
const times = 1000;
const tokens = 100;

// Calculating a route from complex channels set should result in a route
test(`Get route through complex hops`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  try {
    const [{generate, lnd}, target, remote, far, farthest] = nodes;

    const controlToTargetChan = await setupChannel({
      generate,
      lnd,
      to: target,
    });

    await generate({});

    const targetRemoteChannel = await asyncRetry({
      interval,
      times,
    },
    async () => {
      await generate({});

      await addPeer({
        lnd: target.lnd,
        public_key: remote.id,
        socket: remote.socket,
      });

      return await setupChannel({
        generate: target.generate,
        lnd: target.lnd,
        to: remote,
      });
    });

    await generate({});

    const remoteFarChannel = await asyncRetry({interval, times}, async () => {
      await generate({});

      await addPeer({lnd: remote.lnd, public_key: far.id, socket: far.socket});

      return await setupChannel({
        generate: remote.generate,
        lnd: remote.lnd,
        to: far,
      });
    });

    await target.generate({count: confirmationCount});

    const farFarthestChannel = await asyncRetry({
      interval,
      times,
    },
    async () => {
      await generate({});

      await addPeer({
        lnd: far.lnd,
        public_key: farthest.id,
        socket: farthest.socket,
      });

      return await setupChannel({
        generate: far.generate,
        lnd: far.lnd,
        to: farthest,
      });
    });

    await target.generate({count: confirmationCount});

    await asyncRetry({interval, times}, async () => {
      const wallet = await getWalletInfo({lnd: remote.lnd});

      await addPeer({lnd, public_key: remote.id, socket: remote.socket});

      if (!wallet.is_synced_to_chain) {
        throw new Error('ExpectedWalletSyncedToChain');
      }
    });

    await asyncRetry({interval, times}, async () => {
      const wallet = await getWalletInfo({lnd: far.lnd});

      await addPeer({lnd, public_key: far.id, socket: far.socket});

      if (!wallet.is_synced_to_chain) {
        throw new Error('ExpectedWalletSyncedToChain');
      }
    });

    await asyncRetry({interval, times}, async () => {
      const wallet = await getWalletInfo({lnd: farthest.lnd});

      await addPeer({lnd, public_key: farthest.id, socket: farthest.socket});

      if (!wallet.is_synced_to_chain) {
        throw new Error('ExpectedWalletSyncedToChain');
      }
    });

    await asyncRetry({interval, times}, async () => {
      await getNode({lnd, public_key: remote.id});
    });

    await asyncRetry({interval, times}, async () => {
      const {features} = await getNode({lnd, public_key: far.id});

      if (!features.length) {
        throw new Error('ExpectedFarFeatures');
      }
    });

    await asyncRetry({interval, times}, async () => {
      const {features} = await getNode({lnd, public_key: farthest.id});

      await addPeer({lnd, public_key: farthest.id, socket: farthest.socket});

      if (!features.length) {
        throw new Error('ExpectedFarthestFeatures');
      }
    });

    const invoice = await createInvoice({
      tokens,
      cltv_delta: 50,
      lnd: farthest.lnd,
    });

    const {id} = invoice;
    const {request} = invoice;

    const decodedRequest = await decodePaymentRequest({lnd, request});

    await waitForRoute({
      lnd,
      destination: farthest.id,
      tokens: invoice.tokens,
    });

    const {route} = await asyncRetry({interval, times}, async () => {
      return await getRouteToDestination({
        lnd,
        cltv_delta: decodedRequest.cltv_delta,
        destination: decodedRequest.destination,
        tokens: invoice.tokens,
      });
    });

    const policyAStart = await getChannel({lnd, id: controlToTargetChan.id});
    const policyBStart = await getChannel({lnd, id: targetRemoteChannel.id});
    const policyCStart = await getChannel({lnd, id: remoteFarChannel.id});
    const policyDStart = await getChannel({lnd, id: farFarthestChannel.id});

    await updateRoutingFees({
      cltv_delta: 200,
      lnd: target.lnd,
      transaction_id: targetRemoteChannel.transaction_id,
      transaction_vout: targetRemoteChannel.transaction_vout,
    });

    await updateRoutingFees({
      cltv_delta: 200,
      lnd: remote.lnd,
      transaction_id: targetRemoteChannel.transaction_id,
      transaction_vout: targetRemoteChannel.transaction_vout,
    });

    await updateRoutingFees({
      cltv_delta: 100,
      inbound_base_discount_mtokens: discount,
      lnd: target.lnd,
      transaction_id: controlToTargetChan.transaction_id,
      transaction_vout: controlToTargetChan.transaction_vout,
    });

    await updateRoutingFees({
      cltv_delta: 300,
      lnd: far.lnd,
      transaction_id: remoteFarChannel.transaction_id,
      transaction_vout: remoteFarChannel.transaction_vout,
    });

    await updateRoutingFees({
      cltv_delta: 400,
      lnd: remote.lnd,
      transaction_id: remoteFarChannel.transaction_id,
      transaction_vout: remoteFarChannel.transaction_vout,
    });

    // Control updates their routing policy
    await updateRoutingFees({
      lnd,
      cltv_delta: 100,
      transaction_id: controlToTargetChan.transaction_id,
      transaction_vout: controlToTargetChan.transaction_vout,
    });

    await updateRoutingFees({
      cltv_delta: 500,
      lnd: far.lnd,
      transaction_id: farFarthestChannel.transaction_id,
      transaction_vout: farFarthestChannel.transaction_vout,
    });

    await updateRoutingFees({
      cltv_delta: 100,
      lnd: farthest.lnd,
      transaction_id: farFarthestChannel.transaction_id,
      transaction_vout: farFarthestChannel.transaction_vout,
    });

    // Wait for policy to be updated
    const policyA = await asyncRetry({interval, times}, async () => {
      const policy = await getChannel({lnd, id: controlToTargetChan.id});

      if (policy.updated_at === policyAStart.updated_at) {
        throw new Error('PolicyNotUpdatedYet');
      }

      return policy;
    });

    // A discount should be set for traffic from control to remote
    const discountFee = policyA.policies.find(n => n.public_key === target.id);

    // Wait for policy to be updated
    const policyB = await asyncRetry({interval, times}, async () => {
      const policy = await getChannel({lnd, id: targetRemoteChannel.id});

      if (policy.updated_at === policyBStart.updated_at) {
        throw new Error('PolicyNotUpdatedYet');
      }

      return policy;
    });

    // Wait for policy to be updated
    const policyC = await asyncRetry({interval, times}, async () => {
      const policy = await getChannel({lnd, id: remoteFarChannel.id});

      if (policy.updated_at === policyCStart.updated_at) {
        throw new Error('PolicyNotUpdatedYet');
      }

      return policy;
    });

    const policyD = await asyncRetry({interval, times}, async () => {
      const policy = await getChannel({lnd, id: farFarthestChannel.id});

      if (policy.updated_at === policyDStart.updated_at) {
        throw new Error('PolicyNotUpdatedYet');
      }

      return policy;
    });

    const channelsRoute = routeFromChannels({
      channels: [policyA, policyB, policyC, policyD],
      cltv_delta: decodedRequest.cltv_delta + confirmationCount,
      destination: decodedRequest.destination,
      height: (await getHeight({lnd})).current_block_height,
      mtokens: decodedRequest.mtokens,
      payment: decodedRequest.payment,
      total_mtokens: decodedRequest.mtokens,
    });

    const lndRoute = await getRouteThroughHops({
      lnd,
      cltv_delta: decodedRequest.cltv_delta + confirmationCount,
      mtokens: decodedRequest.mtokens,
      payment: decodedRequest.payment,
      public_keys: [target.id, remote.id, far.id, farthest.id],
      total_mtokens: decodedRequest.mtokens,
    });

    const discounted = BigInt(discountFee.inbound_base_discount_mtokens);

    const gotTotalFee = BigInt(channelsRoute.route.fee_mtokens);

    await payViaRoutes({lnd, id: invoice.id, routes: [channelsRoute.route]});

    equal(gotTotalFee, BigInt(baseFee * 2), 'Got expected discount');

    await kill({});
  } catch (err) {
    await kill({});

    equal(err, null, 'Expected no error');
  }

  return;
});
