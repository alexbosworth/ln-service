const {randomBytes} = require('crypto');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const {delay} = require('./../macros');
const decodePaymentRequest = require('./../../decodePaymentRequest');
const getChannels = require('./../../getChannels');
const getNetworkGraph = require('./../../getNetworkGraph');
const getRoutes = require('./../../getRoutes');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');

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

  await delay(3000);

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await delay(1000);

  await cluster.generate({count: confirmationCount, node: cluster.control});

  await delay(3000);

  const [channel] = (await getChannels({lnd})).channels;

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await delay(1000);

  await cluster.generate({count: confirmationCount, node: cluster.target});

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

  const controlChans = (await getChannels({lnd})).channels;
  const remoteChans = (await getChannels({lnd: cluster.remote.lnd})).channels;

  const [remoteChannel] = remoteChans;
  const [targetChannel] = controlChans;

  const indirectRoute = await getRoutes({
    lnd,
    routes: [[{
      base_fee_mtokens: '1000',
      channel_capacity: remoteChannel.capacity,
      channel_id: remoteChannel.id,
      cltv_delta: 144,
      fee_rate: 1,
      public_key: remoteChannel.partner_public_key,
    }]],
    tokens: decodedRequest.tokens,
  });

  // Specify every hop in the route
  const fullRoute = await getRoutes({
    lnd,
    routes: [[
      {
        base_fee_mtokens: '1000',
        channel_capacity: targetChannel.capacity,
        channel_id: targetChannel.id,
        cltv_delta: 144,
        fee_rate: 1,
        public_key: targetChannel.partner_public_key,
      },
      {
        base_fee_mtokens: '1000',
        channel_capacity: remoteChannel.capacity,
        channel_id: remoteChannel.id,
        cltv_delta: 144,
        fee_rate: 1,
        public_key: remoteChannel.partner_public_key,
      },
    ]],
    tokens: decodedRequest.tokens,
  });

  const [direct] = routes;
  const [full] = fullRoute.routes;
  const {id} = decodedRequest;
  const [indirect] = indirectRoute.routes;

  equal(full.fee, direct.fee, 'Fee is the same across routes');
  equal(full.fee_mtokens, direct.fee_mtokens, 'Fee mtokens equivalent');
  equal(full.mtokens, direct.mtokens, 'Millitokens equivalent');
  equal(full.timeout, direct.timeout, 'Timeouts equivalent');
  equal(full.tokens, direct.tokens, 'Tokens equivalent');

  equal(indirect.fee, direct.fee, 'Fee is the same across routes');
  equal(indirect.fee_mtokens, direct.fee_mtokens, 'Fee mtokens equivalent');
  equal(indirect.mtokens, direct.mtokens, 'Millitokens equivalent');
  equal(indirect.timeout, direct.timeout, 'Timeouts equivalent');
  equal(indirect.tokens, direct.tokens, 'Tokens equivalent');

  direct.hops.forEach((expected, i) => {
    const directHop = direct.hops[i];
    const indirectHop = indirect.hops[i];

    equal(directHop.channel_capacity, expected.channel_capacity, `${i} d-cap`);
    equal(directHop.channel_id, expected.channel_id, `${i} d-hop channel id`);
    equal(directHop.fee, expected.fee, `${i} d-hop fee`);
    equal(directHop.fee_mtokens, expected.fee_mtokens, `${i} d-hop fee mtoks`);
    equal(directHop.forward, expected.forward, `${i} d-hop forward tokens`);
    equal(directHop.forward_mtokens, expected.forward_mtokens, `${i} d-mtok`);
    equal(directHop.timeout, expected.timeout, `${i} d-hop timeout`);

    equal(indirectHop.channel_capacity, expected.channel_capacity, `${i} cap`);
    equal(indirectHop.channel_id, expected.channel_id, `${i} hop channel id`);
    equal(indirectHop.fee, expected.fee, `${i} hop fee`);
    equal(indirectHop.fee_mtokens, expected.fee_mtokens, `${i} hop fee mtoks`);
    equal(indirectHop.forward, expected.forward, `${i} hop forward tokens`);
    equal(indirectHop.forward_mtokens, expected.forward_mtokens, `${i} mtok`);
    equal(indirectHop.timeout, expected.timeout, `${i} hop timeout`);

    return;
  });

  await pay({lnd, path: {id, routes: indirectRoute.routes}});

  await cluster.kill({});

  return end();
});

