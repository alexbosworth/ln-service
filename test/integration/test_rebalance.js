const {test} = require('tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getRoutes} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {routeFromHops} = require('./../../routing');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const tokens = 1e3;

// Rebalancing channels should result in balanced channels
test('Rebalance', async ({end, equal}) => {
  let cluster;

  try {
    cluster = await createCluster({
      is_circular_enabled: true,
      is_remote_skipped: true,
    });
  } catch (err) {
    cluster = await createCluster({is_remote_skipped: true});
  }

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: 1e5,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target.public_key,
    socket: cluster.target.socket,
  });

  await waitForPendingChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.control});

  const controlToTarget = await waitForChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  // Create a channel from the target back to the control
  const targetToControlChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: 1e5,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.control.public_key,
    socket: cluster.control.socket,
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

  const invoice = await createInvoice({lnd, tokens});

  const [inChannelId] = (await getChannels({lnd})).channels.map(({id}) => id);

  const {routes} = await getRoutes({
    lnd,
    tokens,
    destination: cluster.control.public_key,
    outgoing_channel: inChannelId,
  });

  const selfPay = await pay({lnd, path: {routes, id: invoice.id}});

  equal(selfPay.secret, invoice.secret, 'Payment made to self');

  await cluster.kill({});

  return end();
});
