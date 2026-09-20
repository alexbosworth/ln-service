const asyncRetry = require('async/retry');
const {equal} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {paymentPathFromChannels} = require('bolt04');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {createSignedRequest} = require('./../../');
const {createUnsignedRequest} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getChannel} = require('./../../');
const {getHeight} = require('./../../');
const {getInvoice} = require('./../../');
const {getWalletInfo} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {probeForRoute} = require('./../../');
const {pay} = require('./../../');
const {payViaRoutes} = require('./../../');

const count = 100;
const expiry = () => new Date(Date.now() + (4 * 60 * 60 * 1000)).toISOString();
const give = 500000;
const hopCount = 5;
const interval = 100;
const size = 3;
const times = 10000;
const tokens = 100;

// Paying to an encrypted routes invoice should result in a payment
test(`Create an encrypted routes invoice`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  await generate({count});

  try {
    const channel1 = await setupChannel({
      generate,
      lnd,
      give_tokens: give,
      to: target,
    });

    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    const channel2 = await setupChannel({
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

    // Try padded variations on encrypted routes
    const remoteInvoice = await createInvoice({tokens, lnd: remote.lnd});
    const targetInvoice = await createInvoice({tokens, lnd: target.lnd});

    const remotePaymentDetails = parsePaymentRequest({
      request: remoteInvoice.request,
    });

    const targetPaymentDetails = parsePaymentRequest({
      request: targetInvoice.request,
    });

    const remoteHeight = await getHeight({lnd: remote.lnd});
    const targetHeight = await getHeight({lnd: target.lnd});

    // Paying to a direct peer but with dummy hops to hide that
    const targetPath = paymentPathFromChannels({
      channels: [],
      cltv_delta: targetPaymentDetails.cltv_delta + 3,
      destination: targetPaymentDetails.destination,
      current_block_height: targetHeight.current_block_height,
      hop_count: hopCount,
      id: targetPaymentDetails.payment,
      max_mtokens: targetPaymentDetails.mtokens,
    });

    // Paying to an indirect peer with a receiver fee added
    const remotePath = paymentPathFromChannels({
      channels: [await getChannel({lnd: remote.lnd, id: channel2.id})],
      cltv_delta: remotePaymentDetails.cltv_delta + 3,
      destination: remotePaymentDetails.destination,
      current_block_height: remoteHeight.current_block_height,
      hop_count: hopCount,
      id: remotePaymentDetails.payment,
      max_mtokens: remotePaymentDetails.mtokens,
      receiver_base_fee_mtokens: '1000',
      receiver_fee_rate: 10000,
    });

    equal(remotePath.hops.length, hopCount, 'Got expected hops for target');
    equal(targetPath.hops.length, hopCount, 'Got expected hops for remote');

    // Try paying a remote path
    {
      // Make a blinded version of the invoice
      const {hrp, tags} = createUnsignedRequest({
        description: remotePaymentDetails.description,
        expires_at: remotePaymentDetails.expires_at,
        features: [{bit: 8}, {bit: 15}, {bit: 24}, {bit: 262}],
        id: remotePaymentDetails.id,
        mtokens: remotePaymentDetails.mtokens,
        network: 'regtest',
        paths: [remotePath],
      });

      const request = createSignedRequest({hrp, tags}).request;

      await pay({lnd, request});

      const received = await getInvoice({
        id: remotePaymentDetails.id,
        lnd: remote.lnd,
      });

      equal(received.received_mtokens, '102001', 'Got receiver fee');
    }

    // Try paying a peer path to target
    {
      // Make a blinded version of the invoice
      const {hrp, tags} = createUnsignedRequest({
        description: targetPaymentDetails.description,
        expires_at: targetPaymentDetails.expires_at,
        features: [{bit: 8}, {bit: 15}, {bit: 24}, {bit: 262}],
        id: targetPaymentDetails.id,
        mtokens: targetPaymentDetails.mtokens,
        network: 'regtest',
        paths: [targetPath],
      });

      const {request} = createSignedRequest({hrp, tags});

      const encryptedDetails = parsePaymentRequest({request});

      const {route} = await probeForRoute({
        lnd,
        cltv_delta: encryptedDetails.cltv_delta,
        features: encryptedDetails.features,
        mtokens: encryptedDetails.mtokens,
        paths: encryptedDetails.paths,
        payment: encryptedDetails.payment,
        tokens: encryptedDetails.tokens,
      });

      const {secret} = await payViaRoutes({
        lnd,
        id: encryptedDetails.id,
        routes: [route],
      });

      equal(secret, targetInvoice.secret, 'Got preimage via probe before pay');
    }

    await kill({});
  } catch (err) {
    await kill({});

    strictEqual(err, null, 'Expected no error in create invoice');
  }

  return;
});
