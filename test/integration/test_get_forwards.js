const {test} = require('tap');
const {times} = require('lodash');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const getForwards = require('./../../getForwards');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');

const channelCapacityTokens = 1e6;
const confirmationCount = 10;
const defaultFee = 1e3;
const limit = 1;
const tokens = 100;

// Getting forwarded payments should return all forwarded payments
test('Get forwards', async ({end, equal}) => {
  const cluster = await createCluster({});

  const controlToTargetChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.control.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await addPeer({
    lnd: cluster.control.lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  for (let i = 0, lnd = cluster.remote.lnd; i < 3; i++) {
    await pay({
      lnd: cluster.control.lnd,
      request: (await createInvoice({lnd, tokens: tokens + i})).request,
    });
  }

  const {lnd} = cluster.target;

  const page1 = await getForwards({limit, lnd});

  equal(!!page1.next, true, 'Page 1 leads to page 2');

  {
    const [forward] = page1.forwards;

    equal(!!forward.created_at, true, 'Forward created at');
    equal(forward.fee_mtokens, '1', 'Forward fee charged');
    equal(!!forward.incoming_channel_id, true, 'Forward incoming channel');
    equal(forward.mtokens, '100', 'Forwarded millitokens count');
    equal(!!forward.outgoing_channel_id, true, 'Forward outgoing channel');
    equal(forward.type, 'forward', 'Forward outgoing channel');
  }

  const page2 = await getForwards({lnd, token: page1.next});

  equal(!!page2.next, true, 'Page 2 leads to page 3');

  {
    const [forward] = page2.forwards;

    equal(forward.mtokens, '101', 'Second forward millitokens count');
  }

  const page3 = await getForwards({lnd, token: page2.next});

  equal(!!page3.next, true, 'Page 3 leads to page 4');

  {
    const [forward] = page3.forwards;

    equal(forward.mtokens, '102', 'Third forward millitokens count');
  }

  const page4 = await getForwards({lnd, token: page3.next});

  equal(page4.forwards.length, [].length, 'Page 4 has no results');
  equal(!!page4.next, false, 'Page 4 leads to nowhere');

  cluster.kill();

  return end();
});

