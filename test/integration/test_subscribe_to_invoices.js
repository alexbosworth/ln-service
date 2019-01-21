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
const {subscribeToInvoices} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const description = 'x';
const invoiceId = '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925';
const mtok = '000';
const overPay = 1;
const secret = '0000000000000000000000000000000000000000000000000000000000000000';
const tokens = 1e4;

// Subscribing to invoices should trigger invoice events
test('Subscribe to invoices', async ({end, equal}) => {
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

  await delay(2000);

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await delay(2000);

  // Create a channel from the target back to the control
  const targetToControlChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: (await getWalletInfo({lnd})).public_key,
    socket: `${cluster.control.listen_ip}:${cluster.control.listen_port}`,
  });

  await delay(2000);

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.target});

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

    if (invoice.is_confirmed) {
      equal(!!invoice.confirmed_at, true, 'Invoice confirmed at date')
      equal(invoice.received, tokens + overPay, 'Invoice tokens received');
      equal(invoice.received_mtokens, `${tokens + overPay}${mtok}`, 'Mtokens');

      return end();
    } else {
      equal(invoice.confirmed_at, undefined, 'Invoice not confirmed at date');
      equal(invoice.received, 0, 'Invoice tokens not received');
      equal(invoice.received_mtokens, '0', 'Invoice mtokens not received');
    }

    return;
  });

  sub.on('error', () => {});

  const height = (await getWalletInfo({lnd})).current_block_height;
  invoice = await createInvoice({description, lnd, secret, tokens});
  const mtokens = `${tokens + overPay}${mtok}`;

  await delay(1000);

  // Get control's channels
  const hops = (await getChannels({lnd})).channels.map(({id}) => {
    return {
      base_fee_mtokens: '1000',
      block_height: decodeChanId({number: id}).block_height,
      channel: id,
      cltv_delta: 144,
      fee_rate: 1,
    };
  });

  const {id} = invoice;

  hops.sort((a, b) => a.block_height < b.block_height ? -1 : 1);

  const routes = [routeFromHops({height, hops, mtokens})];

  const selfPay = await pay({lnd, path: {id, routes}});

  await cluster.kill({});

  return;
});

