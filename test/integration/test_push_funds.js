const {decodeChanId} = require('bolt07');
const {test} = require('tap');

const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const {delay} = require('./../macros');
const getChannel = require('./../../getChannel');
const getChannelBalance = require('./../../getChannelBalance');
const getChannels = require('./../../getChannels');
const getPendingChannels = require('./../../getPendingChannels');
const getWalletInfo = require('./../../getWalletInfo');
const {hopsFromChannels} = require('./../../routing');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');
const {routeFromChannels} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const {floor} = Math;
const mtokPerTok = 1e3;
const reserveRatio = 0.01;
const tokens = 1e3;

// Pushing funds via a fee bump should result in the destination getting funds
test('Push funds', async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    give_tokens: floor(channelCapacityTokens * reserveRatio),
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await delay(2000);

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.control});

  const destination = (await getWalletInfo({lnd})).public_key;
  const height = (await getWalletInfo({lnd})).current_block_height;
  const initialBalance = (await getChannelBalance({lnd})).channel_balance;
  const invoice = await createInvoice({lnd});
  const mtokens = '1000';
  const mtokensToGive = BigInt(tokens) * BigInt(mtokPerTok);

  const [{id}] = (await getChannels({lnd})).channels;

  const channel = await getChannel({id, lnd});

  const peerPolicy = channel.policies.find(n => n.public_key !== destination);

  peerPolicy.base_fee_mtokens = mtokensToGive.toString();
  peerPolicy.fee_rate = 0;

  const channels = [channel, channel];

  const {route} = routeFromChannels({channels, destination, height, mtokens});

  await pay({lnd, path: {id: invoice.id, routes: [route]}});

  const finalBalance = (await getChannelBalance({lnd})).channel_balance;

  equal(initialBalance - finalBalance, tokens, 'Funds pushed to peer');

  await cluster.kill({});

  return end();
});
