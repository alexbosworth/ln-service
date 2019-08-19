const {randomBytes} = require('crypto');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {decodePaymentRequest} = require('./../../');
const {getChannels} = require('./../../');
const {getNetworkGraph} = require('./../../');
const {getRoutes} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {routeFromHops} = require('./../../routing');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const buffer = 6;
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const defaultVout = 0;
const mtokPadding = '000';
const tokens = 100;
const txIdHexLength = 32 * 2;

// Getting routes to a destination should return routes to the destination
test(`Get routes`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  await waitForChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  const [channel] = (await getChannels({lnd})).channels;

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: Math.round(channelCapacityTokens / 2),
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await waitForPendingChannel({
    id: targetToRemoteChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await waitForChannel({
    id: targetToRemoteChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  const [remoteChan] = (await getChannels({lnd: cluster.remote.lnd})).channels;

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  const {request} = await createInvoice({tokens, lnd: cluster.remote.lnd});

  const decodedRequest = await decodePaymentRequest({lnd, request});

  const {destination} = decodedRequest;

  await cluster.generate({count: confirmationCount});

  await delay(5000);

  const {routes} = await getRoutes({destination, lnd, tokens});

  const backwardsRoutes = await getRoutes({
    lnd,
    tokens,
    destination: (await getWalletInfo({lnd})).public_key,
    start: cluster.remote_node_public_key,
  });

  equal(backwardsRoutes.routes.length, 1, 'Route can be calculated backwards');

  const ignorePath = await getRoutes({
    destination,
    lnd,
    tokens,
    ignore: [{
      channel: remoteChan.id,
      from_public_key: cluster.target_node_public_key,
      to_public_key: cluster.remote_node_public_key,
    }],
  });

  equal(ignorePath.routes.length, [].length, 'Ignore path removes from paths');

  const ignoreNodes = await getRoutes({
    destination,
    lnd,
    tokens,
    ignore: [{from_public_key: cluster.target_node_public_key}],
  });

  equal(ignoreNodes.routes.length, [].length, 'Ignore nodes ignores nodes');

  const controlChans = (await getChannels({lnd})).channels;
  const remoteChans = (await getChannels({lnd: cluster.remote.lnd})).channels;

  const [remoteChannel] = remoteChans;
  const [targetChannel] = controlChans;

  const indirectRoute = await getRoutes({
    lnd,
    routes: [[
      {
        public_key: cluster.target_node_public_key,
      },
      {
        base_fee_mtokens: '1000',
        channel: remoteChannel.id,
        channel_capacity: remoteChannel.capacity,
        cltv_delta: 40,
        fee_rate: 1,
        public_key: cluster.remote_node_public_key,
      },
    ]],
    tokens: decodedRequest.tokens,
  });

  const currentHeight = await getWalletInfo({lnd});

  const fullRoute = routeFromHops({
    cltv: 40,
    height: (await getWalletInfo({lnd})).current_block_height,
    hops: [
      {
        base_fee_mtokens: '1000',
        channel: targetChannel.id,
        channel_capacity: targetChannel.capacity,
        cltv_delta: 40,
        fee_rate: 1,
        public_key: targetChannel.partner_public_key,
      },
      {
        base_fee_mtokens: '1000',
        channel: remoteChannel.id,
        channel_capacity: remoteChannel.capacity,
        cltv_delta: 40,
        fee_rate: 1,
        public_key: cluster.remote_node_public_key,
      },
    ],
    mtokens: `${tokens}${mtokPadding}`,
  });

  const [direct] = routes;
  const {id} = decodedRequest;
  const [indirect] = indirectRoute.routes;

  equal(fullRoute.fee, direct.fee, 'Fee is the same for full route');
  equal(fullRoute.fee_mtokens, direct.fee_mtokens, 'Fee mtokens same');
  equal(fullRoute.mtokens, direct.mtokens, 'Full route mtokens equivalent');
  equal(fullRoute.timeout, direct.timeout - buffer, 'Timeout equivalent');
  equal(fullRoute.tokens, direct.tokens, 'Full route tokens equivalent');

  equal(indirect.fee, direct.fee, 'Fee is the same across routes');
  equal(indirect.fee_mtokens, direct.fee_mtokens, 'Fee mtokens equivalent');
  equal(indirect.mtokens, direct.mtokens, 'Millitokens equivalent');
  equal(indirect.timeout, direct.timeout - buffer, 'Timeouts equivalent');
  equal(indirect.tokens, direct.tokens, 'Tokens equivalent');

  direct.hops.forEach((expected, i) => {
    const fullHop = fullRoute.hops[i];
    const indirectHop = indirect.hops[i];

    equal(fullHop.channel, expected.channel, `${i} f-hop channel id`);
    equal(fullHop.channel_capacity, expected.channel_capacity, `${i} f-cap`);
    equal(fullHop.fee, expected.fee, `${i} full hop fee`);
    equal(fullHop.fee_mtokens, expected.fee_mtokens, `${i} f-hop fee mtoks`);
    equal(fullHop.forward, expected.forward, `${i} f-hop forward tokens`);
    equal(fullHop.forward_mtokens, expected.forward_mtokens, `${i} f-mtok`);
    equal(fullHop.public_key, expected.public_key, `${i} f-indirect pubkey`);
    equal(fullHop.timeout, expected.timeout - buffer, `${i} f-hop timeout`);

    equal(indirectHop.channel, expected.channel, `${i} hop channel id`);
    equal(indirectHop.channel_capacity, expected.channel_capacity, `${i} cap`);
    equal(indirectHop.fee, expected.fee, `${i} hop fee`);
    equal(indirectHop.fee_mtokens, expected.fee_mtokens, `${i} hop fee mtoks`);
    equal(indirectHop.forward, expected.forward, `${i} hop forward tokens`);
    equal(indirectHop.forward_mtokens, expected.forward_mtokens, `${i} mtok`);
    equal(indirectHop.public_key, expected.public_key, `${i} indirect pubkey`);
    equal(indirectHop.timeout, expected.timeout - buffer, `${i} hop timeout`);

    return;
  });

  await pay({lnd, path: {id, routes}});

  await cluster.kill({});

  return end();
});
