const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {delay} = require('./../macros');
const {getIdentity} = require('./../../');
const {getNode} = require('./../../');
const {setupChannel} = require('./../macros');
const {updateRoutingFees} = require('./../../');

const baseFee = 1337;
const channelCapacityTokens = 1e6;
const cltvDelta = 42;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultAliasLength = '00000000000000000000'.length;
const feeRate = 21;
const interval = 10;
const mtokPerTok = BigInt(1e3);
const size = 3;
const times = 1000;

// Getting a node should return the public graph node info
test(`Get node`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, id, lnd}, target, remote] = nodes;

  try {
    const controlToTarget = await setupChannel({generate, lnd, to: target});

    const targetToRemote = await setupChannel({
      generate: target.generate,
      lnd: target.lnd,
      to: remote,
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
      await addPeer({
        lnd,
        public_key: remote.id,
        retry_count: 1,
        retry_delay: 1,
        socket: remote.socket,
        timeout: 1000,
      });
    });

    await delay(3000);

    const node = await getNode({lnd, public_key: id});

    {
      const {channels} = await getNode({
        lnd,
        is_omitting_channels: true,
        public_key: id,
      });

      equal(channels.length, [].length, 'Channels are omitted')
    }

    if (!!node.channels.length) {
      const [{policies}] = node.channels;

      const policy = policies.find(n => n.public_key === id);

      equal(BigInt(policy.base_fee_mtokens), BigInt(baseFee)*mtokPerTok, 'bf');
      equal(policy.cltv_delta, cltvDelta, 'Got expected cltv delta');
      equal(policy.fee_rate, feeRate, 'Got expected fee rate');
      equal(policy.is_disabled, false, 'Channel is not disabled');
      equal(policy.max_htlc_mtokens, '990000000', 'Max HTLC mtokens returned');
      equal(policy.min_htlc_mtokens, '1000', 'Min HTLC mtokens returned');
    }

    const [socket] = node.sockets;

    equal(node.alias, id.slice(0, defaultAliasLength), 'Alias');
    equal(node.color, '#3399ff', 'Color');
    equal(node.sockets.length, 1, 'Socket');
    equal(!!socket.socket, true, 'Ip, port');
    equal(socket.type, 'tcp', 'Socket type');
    equal(node.updated_at.length, 24, 'Update date');
  } catch (err) {
    strictSame(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return end();
});
