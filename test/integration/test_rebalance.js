const {test} = require('tap');

const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const {decodeFromNumber} = require('./../../bolt07');
const getChannels = require('./../../getChannels');
const getPendingChannels = require('./../../getPendingChannels');
const getWalletInfo = require('./../../getWalletInfo');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');
const {routeFromHops} = require('./../../routing');

const channelCapacityTokens = 1e6;
const confirmationCount = 10;
const defaultFee = 1e3;
const tokens = 1e4;

// Rebalancing channels should result in balanced channels
test('Rebalance', async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  const targetToControlChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: (await getWalletInfo({lnd})).public_key,
    socket: `${cluster.control.listen_ip}:${cluster.control.listen_port}`,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  const height = (await getWalletInfo({lnd})).current_block_height;
  const invoice = await createInvoice({lnd, tokens});
  const mtokens = `${tokens}000`;

  const {channels} = await getChannels({lnd});

  const hops = channels.map(({id}) => {
    return {
      base_fee_mtokens: '1000',
      block_height: decodeFromNumber({id}).block_height,
      channel_id: id,
      cltv_delta: 144,
      fee_rate: 1,
    };
  });

  hops.sort((a, b) => a.block_height < b.block_height ? -1 : 1);

  const {id} = invoice;
  const routes = [routeFromHops({height, hops, mtokens})];

  const selfPay = await pay({lnd, path: {id, routes}});

  equal(selfPay.secret, invoice.secret, 'Payment made to self');

  cluster.kill();

  return end();
});

