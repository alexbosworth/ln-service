const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {getIdentity} = require('./../../');
const {getNode} = require('./../../');
const {updateRoutingFees} = require('./../../');

const baseFee = 1337;
const channelCapacityTokens = 1e6;
const cltvDelta = 42;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultAliasLength = '00000000000000000000'.length;
const delay = n => new Promise(resolve => setTimeout(resolve, n));
const feeRate = 21;
const interval = 10;
const mtokPerTok = BigInt(1e3);
const size = 3;
const times = 1000;

// Getting a node should return the public graph node info
test(`Get node`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, id, lnd}, target, remote] = nodes;

  try {
    const controlToTarget = await asyncRetry({interval, times}, async () => {
      await generate({});

      return await setupChannel({generate, lnd, to: target});
    });

    const targetToRemote = await asyncRetry({interval, times}, async () => {
      await target.generate({});

      return await setupChannel({
        generate: target.generate,
        lnd: target.lnd,
        to: remote,
      });
    });

    await updateRoutingFees({
      lnd,
      base_fee_tokens: baseFee,
      cltv_delta: cltvDelta,
      fee_rate: feeRate,
      transaction_id: controlToTarget.transaction_id,
      transaction_vout: controlToTarget.transaction_vout,
    });

    await asyncRetry({interval, times}, async () => {
      await generate({});

      await addPeer({
        lnd,
        public_key: remote.id,
        retry_count: 1,
        retry_delay: 1,
        socket: remote.socket,
        timeout: 1000,
      });
    });

    const node = await getNode({lnd, public_key: id});

    {
      const {channels} = await getNode({
        lnd,
        is_omitting_channels: true,
        public_key: id,
      });

      strictEqual(channels.length, [].length, 'Channels are omitted');
    }

    if (!!node.channels.length) {
      const [{policies}] = node.channels;

      const policy = policies.find(n => n.public_key === id);

      strictEqual(
        BigInt(policy.base_fee_mtokens),
        BigInt(baseFee) * mtokPerTok,
        'bf'
      );
      strictEqual(policy.cltv_delta, cltvDelta, 'Got expected cltv delta');
      strictEqual(policy.fee_rate, feeRate, 'Got expected fee rate');
      strictEqual(policy.is_disabled, false, 'Channel is not disabled');
      strictEqual(policy.max_htlc_mtokens, '990000000', 'Max HTLC returned');
      strictEqual(policy.min_htlc_mtokens, '1000', 'Min HTLC returned');
    }

    const [socket] = node.sockets;

    strictEqual(node.alias, id.slice(0, defaultAliasLength), 'Alias');
    strictEqual(node.color, '#3399ff', 'Color');
    strictEqual(node.sockets.length, 1, 'Socket');
    strictEqual(!!socket.socket, true, 'Ip, port');
    strictEqual(socket.type, 'tcp', 'Socket type');
    strictEqual(node.updated_at.length, 24, 'Update date');

    await kill({});
  } catch (err) {
    await kill({});

    strictEqual(err, null, 'Expected no error');
  }

  return;
});
