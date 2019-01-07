const {decodeChanId} = require('bolt07');
const {test} = require('tap');

const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const {delay} = require('./../macros');
const getChannels = require('./../../getChannels');
const getPendingChannels = require('./../../getPendingChannels');
const getWalletInfo = require('./../../getWalletInfo');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');
const {routeFromHops} = require('./../../routing');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const mtok = '000';
const tokens = 1e4;

// Encountering errors in payment should return valid error codes
test('Payment errors', async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.control});

  // Create a channel from the target back to the control
  const targetToControlChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: (await getWalletInfo({lnd})).public_key,
    socket: `${cluster.control.listen_ip}:${cluster.control.listen_port}`,
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.target});

  const height = (await getWalletInfo({lnd})).current_block_height;
  const invoice = await createInvoice({lnd, tokens});
  const mtokens = `${tokens}${mtok}`;

  await delay(1000);

  // Get control's channels
  const {channels} = await getChannels({lnd});

  const hops = channels.map(({id}) => {
    return {
      base_fee_mtokens: '1000',
      block_height: decodeChanId({channel: id}).block_height,
      channel: id,
      cltv_delta: 144,
      fee_rate: 1,
    };
  });

  const {id} = invoice;

  try {
    const hops = channels.map(({id}) => {
      return {
        base_fee_mtokens: '1', // Lower fee rate
        block_height: decodeChanId({channel: id}).block_height,
        channel: id,
        cltv_delta: 14,
        fee_rate: 0, // Lower actual fee
      };
    });

    hops.sort((a, b) => a.block_height < b.block_height ? -1 : 1);

    const routes = [routeFromHops({height, hops, mtokens})];

    await pay({lnd, path: {id, routes}});
  } catch (err) {
    const [, code, context] = err;

    equal(code, 'RejectedUnacceptableFee', 'Pay fails due to low fee');
    equal(context.channel, channels.find(n => !n.local_balance).id);
  }

  try {
    const hops = channels.map(({id}) => {
      return {
        base_fee_mtokens: '1000',
        block_height: decodeChanId({channel: id}).block_height,
        channel: id,
        cltv_delta: 14, // Lower CLTV delta
        fee_rate: 1,
      };
    });

    hops.sort((a, b) => a.block_height < b.block_height ? -1 : 1);

    const routes = [routeFromHops({height, hops, mtokens})];

    await pay({lnd, path: {id, routes}});
  } catch (err) {
    const [, code, context] = err;

    equal(code, 'RejectedUnacceptableCltv', 'Pay fails due to low cltv');
    equal(context.channel, channels.find(n => !n.local_balance).id);
  }

  await cluster.kill({});

  return end();
});

