const asyncRetry = require('async/retry');
const {decodeChanId} = require('bolt07');
const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {pay} = require('./../../');
const {routeFromHops} = require('./../../routing');
const {setupChannel} = require('./../macros');

const interval = retryCount => 50 * Math.pow(2, retryCount);
const mtok = '000';
const times = 15;
const tokens = 1e3;

// Encountering errors in payment should return valid error codes
test('Payment errors', async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  const controlToTargetChannel = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  // Create a channel from the target back to the control
  const targetToControlChannel = await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    lnd: cluster.target.lnd,
    to: cluster.control,
  });

  const height = (await getWalletInfo({lnd})).current_block_height;
  const invoice = await createInvoice({lnd, tokens});
  const mtokens = `${tokens}${mtok}`;

  const {channels} = await getChannels({lnd});
  const {id} = invoice;

  const [inChanId, outChanId] = channels.map(({id}) => id).sort();

  const destination = (await getWalletInfo({lnd})).public_key;

  try {
    let route;

    // Wait for graph sync and pay
    await asyncRetry({interval, times}, async () => {
      const inChan = await getChannel({lnd, id: inChanId});
      const outChan = await getChannel({lnd, id: outChanId});

      inChan.id = inChanId;
      outChan.id = outChanId;

      const {hops} = hopsFromChannels({
        destination,
        channels: [inChan, outChan],
      });

      route = routeFromHops({
        height,
        hops,
        mtokens,
        initial_cltv: 40,
      });
    });

    route.hops[0].fee = 0;
    route.hops[0].fee_mtokens = '0';
    route.fee = 0;
    route.fee_mtokens = '0';
    route.mtokens = '1000000';
    route.tokens = 1000;

    await pay({lnd, path: {id, routes: [route]}});
  } catch (err) {
    if (Array.isArray(err)) {
      const [, code, context] = err;

      equal(code, 'RejectedUnacceptableFee', 'Pay fails due to low fee');
      equal((context || {}).channel, channels.find(n => !n.local_balance).id);
    } else {
      equal(err, null, 'Expected array type error');
    }
  }

  await cluster.kill({});

  return end();
});
