const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');
const {cancelHodlInvoice} = require('./../../');
const {createHodlInvoice} = require('./../../');
const {getInvoice} = require('./../../');
const {getChannels} = require('./../../');
const {getClosedChannels} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {closeChannel} = require('./../../');

const interval = 100;
const size = 2;
const times = 1000;
const tokens = 10;

// Closing a pending payments channel should close the channel after a wait
test(`Close channel with wait for pending`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  try {
    // Open a channel from control to target
    const channelOpen = await setupChannel({
      generate: control.generate,
      lnd: control.lnd,
      to: target,
    });

    // Create a hold invoice to create the pending state
    const invoice = await createHodlInvoice({tokens, lnd: target.lnd});

    await asyncAuto({
      makePayment: async () => {
        // Pay to the hold invoice
        try {
          await pay({lnd: control.lnd, request: invoice.request});
        } catch (err) {
          const [, type] = err;

          // We expect that it would be canceled back
          equal(type, 'PaymentRejectedByDestination');
        }
      },

      // Wait for the payment to be held
      lookForPayment: async () => {
        await asyncRetry({interval, times}, async () => {
          const received = await getInvoice({id: invoice.id, lnd: target.lnd});

          if (!received.is_held) {
            throw new Error('ExpectedPaymentHeld');
          }
        });
      },

      // Start the closing process
      closeChannel: ['lookForPayment', async () => {
        try {
          await closeChannel({
            id: channelOpen.id,
            is_graceful_close: true,
            lnd: control.lnd,
          });
        } catch (err) {
          const [,, error] = err;

          const {details} = error.err;

          // LND 0.17.5 and below do not support graceful closes
          if (details === 'cannot co-op close channel with active htlcs') {
            throw new Error('FeatureUnsupported');
          }

          throw err;
        }
      }],

      // Wait for channel to be in closing mode
      confirmClosing: ['lookForPayment', async () => {
        await asyncRetry({interval, times}, async () => {
          const {channels} = await getChannels({lnd: control.lnd});

          if (!channels.filter(n => !n.is_active).length) {
            throw new Error('ExpectedInactiveChannels');
          }
        });
      }],

      // Stop the payment to void the pending state
      cancelPayment: ['confirmClosing', async () => {
        await cancelHodlInvoice({id: invoice.id, lnd: target.lnd});
      }],

      // Confirm that the channel closed cleanly
      confirmClosed: ['cancelPayment', async () => {
        await asyncRetry({interval, times}, async () => {
          const {channels} = await getClosedChannels({lnd: control.lnd});

          await control.generate({});

          if (!channels.filter(n => !!n.is_cooperative_close).length) {
            throw new Error('ExpectedCooperativelyClosedChannels');
          }
        });
      }],
    });
  } catch (err) {
    equal(err.message, 'FeatureUnsupported', 'Expected no error');
  } finally {
    await kill({});
  }

  return;
});
