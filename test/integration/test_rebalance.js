const {test} = require('tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');
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

  await setupChannel({
    lnd,
    generate: cluster.generate,
    give: 1e5,
    to: cluster.target,
  });

  await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    give: 1e5,
    lnd: cluster.target.lnd,
    to: cluster.control,
  });

  const invoice = await createInvoice({lnd, tokens});

  const [inChannelId] = (await getChannels({lnd})).channels.map(({id}) => id);

  const {route} = await getRouteToDestination({
    lnd,
    tokens,
    destination: cluster.control.public_key,
    outgoing_channel: inChannelId,
  });

  const selfPay = await pay({lnd, path: {id: invoice.id, routes: [route]}});

  equal(selfPay.secret, invoice.secret, 'Payment made to self');

  await cluster.kill({});

  return end();
});
