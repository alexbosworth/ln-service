const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {getInvoice} = require('./../../');
const {pay} = require('./../../');

const description = 'description';
const secret = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
const size = 2;
const tokens = 42;

// getInvoice results in invoice details
test(`Get an invoice`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  const channel = await setupChannel({
    generate,
    lnd,
    give_tokens: 1e5,
    to: target,
  });

  const created = await createInvoice({description, lnd, secret, tokens});

  const invoice = await getInvoice({lnd, id: created.id});

  strictEqual(invoice.description, description, 'Invoice description');
  strictEqual(invoice.is_private, false, 'Invoice is public');
  strictEqual(invoice.received, 0, 'Invoice received tokens');
  strictEqual(invoice.received_mtokens, '0', 'Invoice received mtokens');
  strictEqual(invoice.secret, secret, 'Invoice secret');
  strictEqual(invoice.tokens, tokens, 'Invoice tokens');

  await pay({lnd: target.lnd, request: created.request});

  const paid = await getInvoice({lnd, id: created.id});

  if (!!paid.payments.length) {
    strictEqual(paid.payments.length, [created.request].length, 'Paid once');

    const [payment] = paid.payments;

    strictEqual(payment.canceled_at, undefined, 'Payment was not canceled');
    strictEqual(!!payment.confirmed_at, true, 'Payment settle date returned');
    strictEqual(!!payment.created_at, true, 'Payment first held date');
    strictEqual(!!payment.created_height, true, 'Payment height');
    strictEqual(payment.in_channel, channel.id, 'Payment channel id returned');
    strictEqual(payment.is_canceled, false, 'Payment not canceled');
    strictEqual(payment.is_confirmed, true, 'Payment was settled');
    strictEqual(payment.is_held, false, 'Payment is no longer held');
    strictEqual(payment.mtokens, (BigInt(tokens) * BigInt(1e3)).toString());
    strictEqual(payment.pending_index, undefined, 'Pending index not defined');
    strictEqual(payment.tokens, tokens, 'Payment tokens returned');
  }

  strictEqual(paid.is_confirmed, true, 'Invoice has been paid');

  await kill({});

  return;
});
