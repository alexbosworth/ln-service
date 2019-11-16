const {randomBytes} = require('crypto');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getNetworkGraph} = require('./../../');
const {getRoutes} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {routeFromHops} = require('./../../routing');
const {setupChannel} = require('./../macros');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const mtokPadding = '000';
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying an invoice should settle the invoice
test(`Pay`, async ({deepIs, end, equal, rejects}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const channel = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  // Make sure that an error is returned when there is no route
  try {
    const {request} = await createInvoice({tokens, lnd: cluster.remote.lnd});

    rejects(
      payViaPaymentRequest({lnd, request}),
      [503, 'PaymentPathfindingFailedToFindPossibleRoute'],
      'A payment with no route returns an error'
    );
  } catch (err) {
    equal(err, null, 'Expected no error creating invoice');
  }

  const remoteChan = await setupChannel({
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  await waitForRoute({lnd, tokens, destination: cluster.remote.public_key});

  // When a route exists, payment is successful
  try {
    const commitTxFee = channel.commit_transaction_fee;
    const height = (await getWalletInfo({lnd})).current_block_height;
    const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

    const paid = await payViaPaymentRequest({
      lnd,
      max_timeout_height: height + 40 + 43,
      request: invoice.request,
    });

    equal(paid.fee_mtokens, '1000', 'Fee mtokens tokens paid');
    equal(paid.id, invoice.id, 'Payment hash is equal on both sides');
    equal(paid.mtokens, '101000', 'Paid mtokens');
    equal(paid.secret, invoice.secret, 'Paid for invoice secret');

    paid.hops.forEach(n => {
      equal(n.timeout === height + 40 || n.timeout === height + 43, true);

      delete n.timeout;

      return;
    });

    const expectedHops = [
      {
        channel: channel.id,
        channel_capacity: 1000000,
        fee_mtokens: '1000',
        forward_mtokens: `${invoice.tokens}${mtokPadding}`,
      },
      {
        channel: remoteChan.id,
        channel_capacity: 1000000,
        fee_mtokens: '0',
        forward_mtokens: '100000',
      },
    ];

    deepIs(paid.hops, expectedHops, 'Hops are returned');
  } catch (err) {
    equal(err, null, 'Expected no error paying payment request');
  }

  await cluster.kill({});

  return end();
});
