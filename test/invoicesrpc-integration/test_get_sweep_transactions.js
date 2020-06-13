const {createHash} = require('crypto');
const {randomBytes} = require('crypto');

const asyncRetry = require('async/retry');
const {test} = require('tap');

const {createCluster} = require('./../macros');
const {createHodlInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChainTransactions} = require('./../../');
const {getClosedChannels} = require('./../../');
const {getInvoice} = require('./../../');
const {getInvoices} = require('./../../');
const {getSweepTransactions} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToInvoice} = require('./../../');

const blockDelay = 10;
const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const tokens = 100;

// Setup an HTLC and then don't resolve it but go to chain and get sweeps
test(`Get sweep transactionos`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  try {
    await getSweepTransactions({lnd});
  } catch (err) {
    deepIs(err, [501, 'BackingLndDoesNotSupportListingSweeps']);

    await cluster.kill({});

    return end();
  }

  await setupChannel({
    lnd,
    generate: cluster.generate,
    partner_csv_delay: blockDelay,
    to: cluster.target,
  });

  const id = createHash('sha256').update(randomBytes(32)).digest('hex');

  const invoice = await createHodlInvoice({
    id,
    tokens,
    cltv_delta: blockDelay,
    lnd: cluster.target.lnd,
  });

  const sub = subscribeToInvoice({id, lnd: cluster.target.lnd});

  sub.on('invoice_updated', async updated => {
    if (!updated.is_held) {
      return;
    }

    const [created] = (await getInvoices({lnd: cluster.target.lnd})).invoices;

    const invoice = await getInvoice({id, lnd: cluster.target.lnd});

    await asyncRetry({interval: 1, times: 1000}, async () => {
      // Generate to confirm the tx
      await cluster.generate({});

      const {channels} = await getClosedChannels({lnd: cluster.target.lnd});

      if (!channels.length) {
        throw new Error('ExpectedClosedChannels');
      }

      const control = await getSweepTransactions({lnd: cluster.target.lnd})
      const expectedControlSweeps = await getChainTransactions({lnd});
      const target = await getSweepTransactions({lnd: cluster.target.lnd});

      const expectedTargetSweeps = await getChainTransactions({
        lnd: cluster.target.lnd,
      });

      const [expectedTx] = expectedTargetSweeps.transactions;
      const [targetTx] = target.transactions;

      if (targetTx.confirmation_count !== expectedTx.confirmation_count) {
        throw new Error('TargetDoesNotMatchExpectedConfirmationCount');
      }

      equal(control.transactions.length, [control].length, 'Got single sweep');

      const [controlTx] = control.transactions;

      equal(Buffer.from(controlTx.block_id, 'hex').length, 32, 'Blockhash');
      equal(!!controlTx.confirmation_count, true, 'Control is confirmed');
      equal(!!controlTx.confirmation_height, true, 'Control has height');
      equal(!!controlTx.created_at, true, 'Control has date');
      equal(controlTx.fee, undefined, 'Control has no fee');
      equal(Buffer.from(controlTx.id, 'hex').length, 32, 'Transaction id');
      equal(controlTx.is_confirmed, true, 'Control is confirmed true');
      equal(controlTx.is_outgoing, false, 'Control tx is not outgoing');
      equal(controlTx.output_addresses.length, 1, 'Control tx sends to addr');
      equal(controlTx.tokens, 4999999000, 'Control tokens returned');
      equal(!!controlTx.transaction, true, 'Control transaction returned');

      deepIs(target, expectedTargetSweeps, 'Got expected target sweeps');

      return;
    });

    sub.removeAllListeners();

    await delay(2000);

    await cluster.kill({});

    return end();
  });

  let cancelErr = [];

  try {
    await pay({lnd, request: invoice.request});
  } catch (err) {}

  return;
});
