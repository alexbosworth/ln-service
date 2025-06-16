const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {exit} = require('node:process');
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {closeChannel} = require('./../../');
const {getChannel} = require('./../../');
const {subscribeToGraph} = require('./../../');

const capacity = 1e6;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const increaseDelay = n => n * 1000;
const interval = 10;
const size = 2;
const times = 1000;

// Subscribing to graph should trigger graph events
test('Subscribe to channels', async t => {
  const attempts = [];

  t.after(() => exit());

  await asyncRetry({interval, times}, async () => {
    const {kill, nodes} = await spawnLightningCluster({size});

    const [control, target] = nodes;

    const {generate, lnd} = control;

    const channelClosed = [];
    const channelUpdated = [];
    const nodeUpdated = [];
    const {socket} = target;

    attempts.push(socket);

    await delay(increaseDelay(attempts.length));

    const sub = subscribeToGraph({lnd});

    sub.on('channel_closed', update => channelClosed.push(update));
    sub.on('channel_updated', update => channelUpdated.push(update));
    sub.on('node_updated', update => nodeUpdated.push(update));
    sub.on('err', err => {});

    try {
      const channel = await setupChannel({
        capacity,
        generate,
        lnd,
        to: target,
      });

      const {id} = channel;

      const channelPolicies = await getChannel({id, lnd});

      await asyncRetry({interval, times}, async () => {
        await addPeer({lnd, public_key: target.id, socket: target.socket});

        if (!channelUpdated.length) {
          throw new Error('ExpectedChannelUpdated');
        }

        if (nodeUpdated.length !== [control, target].length) {
          throw new Error('ExpectedNodesUpdated');
        }

        return;
      });

      await closeChannel({id, lnd})

      await asyncRetry({interval, times}, async () => {
        await generate({});

        if (!channelClosed.length) {
          throw new Error('ExpectedChannelClosed');
        }

        return;
      });

      const [channelClose] = channelClosed;

      equal(channelClose.capacity, capacity, 'Got closed channel capacity');
      equal(!!channelClose.close_height, true, 'Got closed channel height');
      equal(channelClose.id, id, 'Got closed channel id');
      equal(channelClose.transaction_id, channel.transaction_id, 'Got close');
      equal(channelClose.transaction_vout, channel.transaction_vout, 'Vout');
      equal(!!channelClose.updated_at, true, 'Got close updated at');

      const expectedUpdates = channelPolicies.policies.map(policy => {
        const peer = channelPolicies.policies
          .find(n => n.public_key !== policy.public_key);

        return {
          capacity,
          id,
          base_fee_mtokens: policy.base_fee_mtokens,
          cltv_delta: policy.cltv_delta,
          fee_rate: policy.fee_rate,
          is_disabled: policy.is_disabled,
          inbound_base_discount_mtokens: policy.inbound_base_discount_mtokens,
          inbound_rate_discount: policy.inbound_rate_discount,
          max_htlc_mtokens: policy.max_htlc_mtokens,
          min_htlc_mtokens: policy.min_htlc_mtokens,
          public_keys: [policy.public_key, peer.public_key],
          transaction_id: channel.transaction_id,
          transaction_vout: channel.transaction_vout,
        };
      });

      expectedUpdates.forEach(update => {
        const [key1, key2] = update.public_keys;

        const gotUpdate = channelUpdated.find(chan => {
          const [k1, k2] = chan.public_keys;

          return key1 === k1 && key2 === k2;
        });

        equal(!!gotUpdate.updated_at, true, 'Got updated at policy date');

        delete gotUpdate.updated_at;

        deepEqual(gotUpdate, update, 'Got expected channel announcement');

        return;
      });

      const gotControl = nodeUpdated.find(n => n.public_key === control.id);

      const expectedControl = {
        alias: control.id.substring(0, 20),
        color: '#3399ff',
        public_key: control.id,
        sockets: gotControl.sockets,
      };

      const gotTarget = nodeUpdated.find(n => n.public_key === target.id);

      const expectedTarget = {
        alias: target.id.substring(0, 20),
        color: '#3399ff',
        public_key: target.id,
        sockets: gotTarget.sockets,
      };

      equal(!!gotControl.features, true, 'Got control features');
      equal(!!gotControl.updated_at, true, 'Got control updated at');

      delete gotControl.features;
      delete gotControl.updated_at;

      delete gotTarget.features;
      delete gotTarget.updated_at;

      equal(!!gotTarget, true, 'Got target updated at');

      deepEqual(gotControl, expectedControl, 'Got control node announcement');
      deepEqual(gotTarget, expectedTarget, 'Got target node announcement');

      await kill({});
    } catch (err) {
      await kill({});

      throw err;
    }
  });
});
