const {decodeChanId} = require('bolt07');
const {test} = require('tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {payViaRoutes} = require('./../../');
const {routeFromHops} = require('./../../routing');
const {subscribeToInvoices} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const description = 'x';
const invoiceId = '7426ba0604c3f8682c7016b44673f85c5bd9da2fa6c1080810cf53ae320c9863';
const mtok = '000';
const overPay = 1;
const secret = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
const tlvType = '68730';
const tlvValue = '030201';
const tokens = 1e4;

// Subscribing to invoices should trigger invoice events
test('Subscribe to invoices', async ({end, equal, fail}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const destination = (await getWalletInfo({lnd})).public_key;

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
  await cluster.generate({count: confirmationCount, node: cluster.target});

  const channel = await waitForChannel({
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
    socket: cluster.control.socket,
  });

  await waitForPendingChannel({
    id: targetToControlChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  // Generate to confirm the channel
  await cluster.generate({count: confirmationCount, node: cluster.target});
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await waitForChannel({
    id: targetToControlChannel.transaction_id,
    lnd: cluster.target.lnd,
  });

  let gotUnconfirmedInvoice = false;
  let invoice;
  const mtokens = `${tokens + overPay}${mtok}`;
  const sub = subscribeToInvoices({lnd, restart_delay_ms: 100});

  sub.on('invoice_updated', async invoice => {
    equal(!!invoice.created_at, true, 'Invoice created at');
    equal(invoice.description, description, 'Invoice description');
    equal(!!invoice.expires_at, true, 'Invoice has expiration date');
    equal(invoice.id, invoiceId, 'Invoice has id');
    equal(invoice.index, [invoice].length, 'Invoice index is returned');
    equal(invoice.secret, secret, 'Invoice secret');
    equal(invoice.tokens, tokens, 'Invoice tokens');

    if (invoice.payments.length) {
      equal(invoice.payments.length, [invoice].length, 'Invoice was paid');

      const [payment] = invoice.payments;

      const currentHeight = (await getWalletInfo({lnd})).current_block_height;

      equal(payment.canceled_at, undefined, 'Payment was not canceled');
      equal(!!payment.confirmed_at, true, 'Payment settle date returned');
      equal(!!payment.created_at, true, 'Payment first held date returned');
      equal(payment.created_height, currentHeight, 'Payment height recorded');
      equal(!!payment.in_channel, true, 'Payment channel id returned');
      equal(payment.is_canceled, false, 'Payment not canceled');
      equal(payment.is_confirmed, true, 'Payment was settled');
      equal(payment.is_held, false, 'Payment is no longer held');
      equal(payment.mtokens, mtokens, 'Mtokens received');
      equal(payment.pending_index, undefined, 'Pending index not defined');
      equal(payment.tokens, tokens + overPay, 'Payment tokens returned');
    }

    if (invoice.is_confirmed && !gotUnconfirmedInvoice) {
      fail('Expected unconfirmed invoice before confirmed invoice');
    }

    if (!!invoice.payments.length) {
      const [payment] = invoice.payments;

      if (!!payment.messages.length) {
        const [{messages}] = invoice.payments;

        const [{type, value}] = messages;

        equal(type, tlvType, 'Got tlv type back in message');
        equal(value, tlvValue, 'Got tlv value back in message');
      }
    }

    if (invoice.is_confirmed) {
      equal(!!invoice.confirmed_at, true, 'Invoice confirmed at date')
      equal(invoice.confirmed_index, 1, 'Confirmation index is returned');
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
  invoice = await createInvoice({description, lnd, secret, tokens});

  const inChanId = (await getChannels({lnd})).channels
    .find(n => n.transaction_id === controlToTargetChannel.transaction_id).id;

  const outChanId = (await getChannels({lnd: cluster.target.lnd})).channels
    .find(n => n.transaction_id === targetToControlChannel.transaction_id).id;

  await delay(1000);

  const inChan = await getChannel({lnd, id: inChanId});
  const outChan = await getChannel({lnd, id: outChanId});

  inChan.id = inChanId;
  outChan.id = outChanId;

  const {hops} = hopsFromChannels({destination, channels: [inChan, outChan]});
  const {id} = invoice;

  const routes = [routeFromHops({
    height,
    hops,
    mtokens,
    initial_cltv: 40,
  })];

  routes[0].messages = [{type: tlvType, value: tlvValue}];

  const selfPay = await payViaRoutes({id, lnd, routes});

  sub.removeAllListeners();

  await cluster.kill({});

  return;
});
