const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {hopsFromChannels} = require('bolt07');
const {routeFromHops} = require('bolt07');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {getChannel} = require('./../../');
const {pay} = require('./../../');
const {subscribeToInvoices} = require('./../../');

const channelCapacityTokens = 1e6;
const description = 'x';
const interval = 10;
const invoiceId = '7426ba0604c3f8682c7016b44673f85c5bd9da2fa6c1080810cf53ae320c9863';
const mtok = '000';
const overPay = 1;
const secret = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
const size = 2;
const tlvType = '68730';
const tlvValue = '030201';
const times = 3000;
const tokens = 1e4;

// Subscribing to invoices should trigger invoice events
test('Subscribe to invoices', async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {generate, lnd} = control;

  const destination = control.id;

  try {
    await generate({count: 100});

    // Create a channel from the control to the target node
    const controlToTargetChannel = await setupChannel({
      generate,
      lnd,
      give_tokens: 1e5,
      to: target,
    });

    // Create a channel from the target back to the control
    const targetToControlChannel = await setupChannel({
      lnd: target.lnd,
      generate: target.generate,
      give_tokens: 1e5,
      to: control,
    });

    // Created invoices are emitted
    {
      const sub = subscribeToInvoices({lnd, restart_delay_ms: 1});

      const updates = [];

      sub.on('invoice_updated', updated => updates.push(updated));

      const update = await asyncRetry({interval, times}, async () => {
        await createInvoice({lnd});

        const [update] = updates;

        if (!update) {
          throw new Error('ExpectedInvoiceUpdate');
        }

        return update;
      });

      equal(update.tokens, 0, 'Invoiced zero');

      sub.removeAllListeners();
    }

    // Paid invoices are emitted
    {
      const sub = subscribeToInvoices({lnd, restart_delay_ms: 1});

      const updates = [];

      sub.on('invoice_updated', updated => updates.push(updated));

      const update = await asyncRetry({interval, times}, async () => {
        await pay({
          lnd: target.lnd,
          request: (await createInvoice({lnd, tokens})).request,
        });

        const [update] = updates.filter(n => n.is_confirmed);

        if (!update) {
          throw new Error('ExpectedPaidInvoiceUpdate');
        }

        return update;
      });

      equal(!!update.confirmed_at, true, 'Got receive date');
      equal(!!update.confirmed_index, true, 'Got confirm index');
      equal(update.payments.length, 1, 'Got received HTLC');
      equal(update.received, tokens, 'Got received tokens');
      equal(update.received_mtokens, '10000000', 'Got invoice mtokens');

      sub.removeAllListeners();
    }

    // Old invoices are emitted
    {
      const sub = subscribeToInvoices({
        lnd,
        added_after: 1,
        restart_delay_ms: 1,
      });

      const updates = [];

      sub.on('invoice_updated', updated => updates.push(updated));

      const update = await asyncRetry({interval, times}, async () => {
        const [update] = updates;

        if (!update) {
          throw new Error('ExpectedPastInvoiceUpdate');
        }

        return update;
      });

      equal(update.index, 2, 'Got past update');

      sub.removeAllListeners();
    }
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
