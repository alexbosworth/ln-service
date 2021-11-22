const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const size = 2;
const tokens = 1e3;

// Rebalancing channels should result in balanced channels
test('Rebalance', async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {generate, lnd} = control;

  await setupChannel({generate, lnd, give: 1e5, to: target});

  await setupChannel({
    generate: target.generate,
    give: 1e5,
    lnd: target.lnd,
    to: control,
  });

  const invoice = await createInvoice({lnd, tokens});

  const [inChannelId] = (await getChannels({lnd})).channels.map(({id}) => id);

  const {route} = await getRouteToDestination({
    lnd,
    tokens,
    destination: control.id,
    outgoing_channel: inChannelId,
    payment: invoice.payment,
    total_mtokens: !!invoice.payment ? invoice.mtokens : undefined,
  });

  const selfPay = await pay({lnd, path: {id: invoice.id, routes: [route]}});

  equal(selfPay.secret, invoice.secret, 'Payment made to self');

  await kill({});

  return end();
});
