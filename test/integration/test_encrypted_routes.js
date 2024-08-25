const asyncRetry = require('async/retry');
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getWalletInfo} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {pay} = require('./../../');

const count = 100;
const expiry = () => new Date(Date.now() + (4 * 60 * 60 * 1000)).toISOString();
const give = 500000;
const interval = 100;
const size = 3;
const times = 10000;
const tokens = 100;

// Paying to an encrypted routes invoice should result in a payment
test(`Create an invoice`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  await generate({count});

  try {
    await setupChannel({generate, lnd, give_tokens: give, to: target});

    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    await setupChannel({
      generate: target.generate,
      give_tokens: give,
      lnd: target.lnd,
      to: remote,
    });

    await asyncRetry({interval, times}, async () => {
      await generate({});

      const invoice = await createInvoice({
        lnd,
        tokens,
        expires_at: expiry(),
        is_encrypting_routes: true,
      });

      await addPeer({lnd, public_key: remote.id, socket: remote.socket});

      await pay({lnd: remote.lnd, request: invoice.request});
    });

    await kill({});
  } catch (err) {
    await kill({});

    strictEqual(err, null, 'Expected no error in create invoice');
  }

  return;
});
