const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {cancelHodlInvoice} = require('./../../');
const {createHodlInvoice} = require('./../../');
const {createInvoice} = require('./../../');
const {parsePaymentRequest} = require('./../../');

const interval = 10;
const size = 3;
const times = 1000;
const tokens = 100;

// createInvoice should result in a created invoice with hop hints
test(`Create an invoice with hop hints`, async t => {
  const {kill, nodes} = await spawnLightningCluster({size});

  t.after(async () => await kill({}));

  const [{generate, lnd}, target, remote] = nodes;

  const channel = await setupChannel({generate, lnd, to: target});

  const remoteChannel = await setupChannel({
    generate: target.generate,
    is_private: true,
    lnd: target.lnd,
    to: remote,
  });

  const specialRoutes = [[
    {
      public_key: target.id,
    },
    {
      base_fee_mtokens: '123456',
      channel: remoteChannel.id,
      cltv_delta: 200,
      fee_rate: 123456,
      public_key: remote.id,
    },
  ]];

  const invoice = await asyncRetry({interval, times}, async () => {
    const invoice = await createInvoice({
      tokens,
      is_including_private_channels: true,
      lnd: remote.lnd,
      routes: specialRoutes,
    });

    const hodlInvoice = await createHodlInvoice({
      tokens,
      is_including_private_channels: true,
      lnd: remote.lnd,
      routes: specialRoutes,
    });

    const {routes} = parsePaymentRequest({request: invoice.request});

    // Wait for private routes to get picked up
    if (!routes) {
      await cancelHodlInvoice({id: invoice.id, lnd: remote.lnd});

      throw new Error('ExpectedRouteForInvoice');
    }

    const hodl = parsePaymentRequest({request: hodlInvoice.request});

    // Wait for private routes to get picked up
    if (!hodl.routes) {
      await cancelHodlInvoice({id: hodl.id, lnd: remote.lnd});

      throw new Error('ExpectedRouteForHodlInvoice');
    }

    return {
      normal_routes: routes,
      hodl_routes: hodl.routes,
    };
  });

  deepEqual(invoice.normal_routes, specialRoutes, 'Got expected routes');
  deepEqual(invoice.hodl_routes, specialRoutes, 'Got expected hodl routes');

  return;
});
