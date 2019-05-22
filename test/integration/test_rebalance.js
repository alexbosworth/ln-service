const {decodeChanId} = require('bolt07');
const {test} = require('tap');

const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const {delay} = require('./../macros');
const getChannel = require('./../../getChannel');
const getChannels = require('./../../getChannels');
const getPendingChannels = require('./../../getPendingChannels');
const getWalletInfo = require('./../../getWalletInfo');
const {hopsFromChannels} = require('./../../routing');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');
const {routeFromHops} = require('./../../routing');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const mtok = '000';
const tokens = 1e3;

// Rebalancing channels should result in balanced channels
test('Rebalance', async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: 1e5,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await waitForChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  // Create a channel from the target back to the control
  const targetToControlChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: 1e5,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: (await getWalletInfo({lnd})).public_key,
    socket: `${cluster.control.listen_ip}:${cluster.control.listen_port}`,
  });

  await waitForPendingChannel({
    id: targetToControlChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.target});

  await waitForChannel({
    id: targetToControlChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  const height = (await getWalletInfo({lnd})).current_block_height;
  const invoice = await createInvoice({lnd, tokens});
  const mtokens = `${tokens}${mtok}`;

  await delay(3000);

  const {channels} = await getChannels({lnd});

  const [inChannelId, outChannelId] = channels.map(({id}) => id);

  const inChan = await getChannel({lnd, id: inChannelId});
  const outChan = await getChannel({lnd, id: outChannelId});

  inChan.id = inChannelId;
  outChan.id = outChannelId;

  const destination = (await getWalletInfo({lnd})).public_key;
  const {id} = invoice;

  const {hops} = hopsFromChannels({destination, channels: [inChan, outChan]});

  const routes = [routeFromHops({height, hops, mtokens})];

  const selfPay = await pay({lnd, path: {id, routes}});

  equal(selfPay.secret, invoice.secret, 'Payment made to self');

  await cluster.kill({});

  return end();
});
