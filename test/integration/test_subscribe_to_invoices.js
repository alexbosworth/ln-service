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
const {subscribeToInvoices} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const description = 'x';
const invoiceId = '7426ba0604c3f8682c7016b44673f85c5bd9da2fa6c1080810cf53ae320c9863';
const mtok = '000';
const overPay = 1;
const secret = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
const tokens = 1e4;

// Subscribing to invoices should trigger invoice events
test('Subscribe to invoices', async ({end, equal, fail}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const destination = (await getWalletInfo({lnd})).public_key;

  await delay(3000);

  // Create a channel from the control to the target node
  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: 1e5,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await delay(3000);

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await delay(3000);

  // Create a channel from the target back to the control
  const targetToControlChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: 1e5,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: (await getWalletInfo({lnd})).public_key,
    socket: `${cluster.control.listen_ip}:${cluster.control.listen_port}`,
  });

  await delay(2000);

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.target});

  await delay(2000);

  let gotUnconfirmedInvoice = false;
  let invoice;
  const sub = subscribeToInvoices({lnd});

  sub.on('data', invoice => {
    equal(!!invoice.created_at, true, 'Invoice created at');
    equal(invoice.description, description, 'Invoice description');
    equal(!!invoice.expires_at, true, 'Invoice has expiration date');
    equal(invoice.id, invoiceId, 'Invoice has id');
    equal(invoice.is_outgoing, false, 'Invoice is incoming');
    equal(invoice.secret, secret, 'Invoice secret');
    equal(invoice.tokens, tokens, 'Invoice tokens');
    equal(invoice.type, 'channel_transaction', 'Invoice is chan tx');

    if (invoice.is_confirmed && !gotUnconfirmedInvoice) {
      fail('Expected unconfirmed invoice before confirmed invoice');
    }

    if (invoice.is_confirmed) {
      equal(!!invoice.confirmed_at, true, 'Invoice confirmed at date')
      equal(invoice.received, tokens + overPay, 'Invoice tokens received');
      equal(invoice.received_mtokens, `${tokens + overPay}${mtok}`, 'Mtokens');

      return end();
    } else {
      equal(invoice.confirmed_at, undefined, 'Invoice not confirmed at date');
      equal(invoice.received, 0, 'Invoice tokens not received');
      equal(invoice.received_mtokens, '0', 'Invoice mtokens not received');

      return gotUnconfirmedInvoice = true;
    }
  });

  sub.on('error', () => {});

  const height = (await getWalletInfo({lnd})).current_block_height;
  const {channels} = await getChannels({lnd});
  invoice = await createInvoice({description, lnd, secret, tokens});
  const mtokens = `${tokens + overPay}${mtok}`;

  const [inChanId, outChanId] = channels.map(({id}) => id).sort();

  await delay(1000);

  const inChan = await getChannel({lnd, id: inChanId});
  const outChan = await getChannel({lnd, id: outChanId});

  inChan.id = inChanId;
  outChan.id = outChanId;

  const {hops} = hopsFromChannels({destination, channels: [inChan, outChan]});
  const {id} = invoice;

  const routes = [routeFromHops({height, hops, mtokens})];

  const selfPay = await pay({lnd, path: {id, routes}});

  await cluster.kill({});

  return;
});
