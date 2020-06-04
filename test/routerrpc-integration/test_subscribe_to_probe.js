const {once} = require('events');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {deleteForwardingReputations} = require('./../../');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getRoutes} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToProbe} = require('./../../');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const tokens = 1e6 / 2;

// Subscribing to a a route probe should return route probe events
test('Subscribe to probe', async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  const controlToTargetChan = await setupChannel({
    lnd,
    capacity: channelCapacityTokens * 2,
    generate: cluster.generate,
    to: cluster.target,
  });

  const targetToRemoteChan = await setupChannel({
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    give: Math.round(channelCapacityTokens / 2),
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  const {channels} = await getChannels({lnd: cluster.remote.lnd});

  const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

  await delay(1000);

  const sub = subscribeToProbe({
    lnd,
    destination: cluster.remote_node_public_key,
    tokens: invoice.tokens,
  });

  sub.on('error', () => {});

  const [{route}] = await once(sub, 'probing');

  // On 0.7.1 confidence is not supported
  delete route.confidence;

  // On 0.8.2 and below messages are not supported
  delete route.messages;

  deepIs(route, {
    fee: 1,
    fee_mtokens: '1500',
    hops: [
      {
        channel: controlToTargetChan.id,
        channel_capacity: controlToTargetChan.capacity,
        fee: 1,
        fee_mtokens: '1500',
        forward: tokens,
        forward_mtokens: `${tokens}000`,
        public_key: cluster.target_node_public_key,
        timeout: 500,
      },
      {
        channel: targetToRemoteChan.id,
        channel_capacity: targetToRemoteChan.capacity,
        fee: 0,
        fee_mtokens: '0',
        forward: tokens,
        forward_mtokens: `${tokens}000`,
        public_key: cluster.remote_node_public_key,
        timeout: 500,
      }
    ],
    mtokens: '500001500',
    safe_fee: 2,
    safe_tokens: 500002,
    timeout: 540,
    tokens: 500001,
  });

  const [tempChanFail] = await once(sub, 'routing_failure');

  const failChannel = await getChannel({lnd, id: tempChanFail.channel});

  equal(tempChanFail.channel, targetToRemoteChan.id, 'Fail at target chan');

  const failPolicy = failChannel.policies
    .find(n => n.public_key === cluster.target_node_public_key);

  equal(tempChanFail.policy.base_fee_mtokens, failPolicy.base_fee_mtokens);
  equal(tempChanFail.policy.cltv_delta, failPolicy.cltv_delta, 'Poilcy cltv');
  equal(tempChanFail.policy.fee_rate, failPolicy.fee_rate, 'Fail fee rate');
  equal(tempChanFail.policy.is_disabled, failPolicy.is_disabled, 'Disabled');
  equal(tempChanFail.policy.min_htlc_mtokens, failPolicy.min_htlc_mtokens);
  equal(!!tempChanFail.policy.updated_at, true, 'Updated');
  equal(tempChanFail.reason, 'TemporaryChannelFailure', 'Failure reason');
  deepIs(tempChanFail.route, route, 'Failure on route');
  equal(tempChanFail.update.chain, chain, 'Failure in chain');
  equal(tempChanFail.update.channel_flags !== undefined, true, 'Chan flags');
  equal(tempChanFail.update.extra_opaque_data, '', 'Extra opaque data');
  equal(tempChanFail.update.message_flags, 1, 'Has extra chan details');
  equal(tempChanFail.update.signature.length, 64 * 2, 'Has signature');

  // Create a new channel to increase total edge liquidity
  await setupChannel({
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    to: cluster.remote,
  });

  await deleteForwardingReputations({lnd});

  const subSuccess = subscribeToProbe({
    lnd,
    destination: cluster.remote_node_public_key,
    tokens: invoice.tokens,
  });

  subSuccess.on('error', () => {});

  const [success] = await once(subSuccess, 'probe_success');

  equal(success.route.fee, 1, 'Successful route fee');
  equal(success.route.fee_mtokens, '1500', 'Successful route fee mtokens');
  equal(success.route.hops.length, 2, 'Successful route returned');
  equal(success.route.mtokens, '500001500', 'Successful route mtokens');
  equal(success.route.timeout, 546, 'Successful route timeout');
  equal(success.route.tokens, 500001, 'Successful route tokens');
  equal(success.update, undefined, 'Success extra update info');

  // Check that the probe failure timeout will apply
  const subTimeout = subscribeToProbe({
    lnd,
    destination: cluster.remote_node_public_key,
    probe_timeout_ms: 100,
    tokens: invoice.tokens,
  });

  const [[timeoutCode, timeoutMessage]] = await once(subTimeout, 'error');

  equal(timeoutCode, 503, 'Timeout code received');
  equal(timeoutMessage, 'ProbeTimeout', 'Timeout message received');

  await cluster.kill({});

  return end();
});
