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
const {payViaPaymentDetails} = require('./../../');
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

  const remoteChan = await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  const height = (await getWalletInfo({lnd})).current_block_height;
  const invoice = await createInvoice({tokens, lnd: cluster.remote.lnd});

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

  await waitForRoute({
    lnd,
    destination: cluster.remote.public_key,
    tokens: invoice.tokens,
  });

  try {
    const paid = await payViaPaymentDetails({
      lnd,
      destination: cluster.remote.public_key,
      tokens: invoice.tokens,
    });
  } catch (err) {
    deepIs(err, [
      503,
      'PaymentRejectedByDestination',
      {
        route: {
          fee: 1,
          fee_mtokens: '1000',
          hops: [
            {
              channel: channel.id,
              channel_capacity: 1000000,
              fee: 1,
              fee_mtokens: '1000',
              forward: 100,
              forward_mtokens: '100000',
              public_key: cluster.target.public_key,
              timeout: height + 43,
            },
            {
              channel: remoteChan.id,
              channel_capacity: 1000000,
              fee: 0,
              fee_mtokens: '0',
              forward: 100,
              forward_mtokens: '100000',
              public_key: cluster.remote.public_key,
              timeout: height + 43,
            },
          ],
          mtokens: '101000',
          timeout: height + 40 + 43,
          tokens: invoice.tokens + 1,
        },
      },
    ]);
  }

  try {
    const tooSoonCltv = await payViaPaymentDetails({
      lnd,
      destination: cluster.remote.public_key,
      id: invoice.id,
      max_timeout_height: height + 43,
      tokens: invoice.tokens,
    });

    equal(tooSoonCltv, null, 'Should not be able to pay a too soon CLTV');
  } catch (err) {
    deepIs(err, [503, 'FailedToFindPayableRouteToDestination'], 'Max cltv');
  }

  try {
    const paid = await payViaPaymentDetails({
      lnd,
      destination: cluster.remote.public_key,
      id: invoice.id,
      max_timeout_height: height + 90,
      tokens: invoice.tokens,
    });

    equal(paid.fee, 1, 'Fee tokens paid');
    equal(paid.fee_mtokens, '1000', 'Fee mtokens tokens paid');
    equal(paid.id, invoice.id, 'Payment hash is equal on both sides');
    equal(paid.mtokens, '101000', 'Paid mtokens');
    equal(paid.secret, invoice.secret, 'Paid for invoice secret');

    paid.hops.forEach(n => {
      equal(n.timeout === height + 40 || n.timeout === height + 43, true);

      delete n.timeout;

      return;
    });

    deepIs(paid.hops, expectedHops, 'Hops are returned');
  } catch (err) {
    equal(err, null, 'No error is thrown when payment is attempted');
  }

  await cluster.kill({});

  return end();
});
