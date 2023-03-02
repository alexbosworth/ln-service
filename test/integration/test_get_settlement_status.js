const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {getSettlementStatus} = require('./../../');
const {pay} = require('./../../');

const fakeChannelId = '1x1x1';
const interval = 100;
const size = 2;
const times = 2000;
const tokens = 100;

// Get the settlement status of an HTLC
test(`Get settlement status`, async ({end, equal, strictSame}) => {
  // LND 0.15.5 and below do not support settlement status lookups
  {
    const {kill, nodes} = await spawnLightningCluster({size});

    const [{generate, lnd}, target] = nodes;

    try {
      await getSettlementStatus({
        lnd: target.lnd,
        channel: fakeChannelId,
        payment: Number(),
      });
    } catch (err) {
      const [code, message] = err;

      if (code !== 404) {
        equal(code, 501, 'Method unsupported');
        equal(message, 'LookupHtlcResolutionMethodUnsupported', 'Unsupported');

        await kill({});

        return end();
      }
    }
  }

  const {kill, nodes} = await spawnLightningCluster({
    size,
    lnd_configuration: ['--store-final-htlc-resolutions'],
  });

  const [{generate, lnd}, target] = nodes;

  try {
    const channel = await setupChannel({generate, lnd, to: target});

    const {request} = await createInvoice({tokens, lnd: target.lnd});

    const payment = await pay({lnd, request});

    const settlement = await asyncRetry({interval, times}, async () => {
      return await getSettlementStatus({
        lnd: target.lnd,
        channel: channel.id,
        payment: Number(),
      });
    });

    strictSame(settlement, {is_onchain: false, is_settled: true}, 'Status');
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return end();
});
