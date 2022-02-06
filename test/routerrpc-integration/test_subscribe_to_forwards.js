const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {cancelHodlInvoice} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getWalletInfo} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToForwards} = require('./../../');

const anchorsFeatureBit = 23;
const interval = 10;
const size = 3;
const times = 1000;
const tokens = 100;

// Subscribing to forwards should show forwarding events
test('Subscribe to forwards', async ({end, equal, rejects, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  try {
    const {features} = await getWalletInfo({lnd});
    const testSub = subscribeToForwards({lnd});

    const isAnchors = !!features.find(n => n.bit === anchorsFeatureBit);

    const controlChannel = await setupChannel({generate, lnd, to: target});

    const targetChannel = await setupChannel({
      generate: target.generate,
      give: 5e5,
      lnd: target.lnd,
      to: remote,
    });

    await asyncRetry({interval, times}, async () => {
      await addPeer({
        lnd,
        public_key: remote.id,
        retry_count: 1,
        retry_delay: 1,
        socket: remote.socket,
        timeout: 1000,
      });
    });

    await delay(3000);

    const controlErrors = [];
    const controlForwards = [];
    const controlSub = subscribeToForwards({lnd});
    const targetErrors = [];
    const targetForwards = [];
    const targetSub = subscribeToForwards({lnd: target.lnd});
    const remoteErrors = [];
    const remoteForwards = [];
    const remoteSub = subscribeToForwards({lnd: remote.lnd});

    controlSub.on('error', err => controlErrors.push(err));
    controlSub.on('forward', forward => controlForwards.push(forward));
    targetSub.on('error', err => targetErrors.push(err));
    targetSub.on('forward', forward => targetForwards.push(forward));
    remoteSub.on('error', err => remoteErrors.push(err));
    remoteSub.on('forward', forward => remoteForwards.push(forward));

    await asyncRetry({interval, times}, async () => {
      // Pay the remote through the target
      await payViaPaymentRequest({
        lnd,
        request: (await createInvoice({lnd: remote.lnd, tokens})).request,
      });
    });

    const [channel] = (await getChannels({lnd: remote.lnd})).channels;

    const tooMuchInvoice = await createInvoice({
      lnd: remote.lnd,
      tokens: channel.remote_balance,
    });


    await rejects(
      payViaPaymentRequest({lnd, request: tooMuchInvoice.request}),
      [503, 'PaymentPathfindingFailedToFindPossibleRoute'],
      'TempChan fail'
    );

    const deadInvoice = await createInvoice({tokens, lnd: target.lnd});

    await cancelHodlInvoice({id: deadInvoice.id, lnd: target.lnd});

    await rejects(
      payViaPaymentRequest({lnd, request: deadInvoice.request}),
      [503, 'PaymentRejectedByDestination'],
      'Rejection fail'
    );

    const [err] = controlErrors;

    if (!!err && err.details === 'unknown service routerrpc.Router') {
      await kill({});

      return end();
    }

    await asyncRetry({interval: 1000, times: 30}, async () => {
      if (controlForwards.length !== 6) {
        throw new Error('ExpectedFullListOfControlForwards');
      }

      return;
    });

    [controlSub, remoteSub, targetSub].forEach(n => n.removeAllListeners());

    // LND 0.13.0 and below do not support secret
    [controlForwards, targetForwards, remoteForwards].forEach(forwards => {
      return forwards.forEach(n => delete n.at && delete n.secret);
    });

    const height = (await getHeight({lnd})).current_block_height;

    // LND 0.11.1 and before do not use anchor channels
    if (!isAnchors) {
      strictSame(controlForwards, [
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: false,
          is_receive: false,
          is_send: true,
          mtokens: '101000',
          out_channel: controlChannel.id,
          out_payment: 0,
          timeout: height + 40 + 43,
          tokens: 101,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: true,
          is_failed: false,
          is_receive: false,
          is_send: true,
          mtokens: undefined,
          out_channel: controlChannel.id,
          out_payment: 0,
          timeout: undefined,
          tokens: undefined,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: false,
          is_receive: false,
          is_send: true,
          mtokens: '490851490',
          out_channel: controlChannel.id,
          out_payment: 1,
          timeout: height + 40 + 43,
          tokens: 490851,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: true,
          is_receive: false,
          is_send: true,
          mtokens: undefined,
          out_channel: controlChannel.id,
          out_payment: 1,
          timeout: undefined,
          tokens: undefined,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: false,
          is_receive: false,
          is_send: true,
          mtokens: '100000',
          out_channel: controlChannel.id,
          out_payment: 2,
          timeout: height + 43,
          tokens: 100,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: true,
          is_receive: false,
          is_send: true,
          mtokens: undefined,
          out_channel: controlChannel.id,
          out_payment: 2,
          timeout: undefined,
          tokens: undefined,
        },
      ],
      'Got control forward events');

      strictSame(targetForwards, [
        {
          cltv_delta: 40,
          external_failure: undefined,
          fee: 1,
          fee_mtokens: '1000',
          in_channel: controlChannel.id,
          in_payment: 0,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: false,
          is_receive: false,
          is_send: false,
          mtokens: '100000',
          out_channel: targetChannel.id,
          out_payment: 0,
          timeout: 497,
          tokens: 100,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: controlChannel.id,
          in_payment: 0,
          internal_failure: undefined,
          is_confirmed: true,
          is_failed: false,
          is_receive: false,
          is_send: false,
          mtokens: undefined,
          out_channel: targetChannel.id,
          out_payment: 0,
          timeout: undefined,
          tokens: undefined,
        },
        {
          cltv_delta: 40,
          external_failure: 'TEMPORARY_CHANNEL_FAILURE',
          fee: 1,
          fee_mtokens: '1490',
          in_channel: controlChannel.id,
          in_payment: 1,
          internal_failure: 'INSUFFICIENT_BALANCE',
          is_confirmed: false,
          is_failed: true,
          is_receive: false,
          is_send: false,
          mtokens: '490850000',
          out_channel: targetChannel.id,
          out_payment: 0,
          timeout: 497,
          tokens: 490850,
        },
        {
          cltv_delta: undefined,
          external_failure: 'INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS',
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: controlChannel.id,
          in_payment: 2,
          internal_failure: 'INVOICE_NOT_OPEN',
          is_confirmed: false,
          is_failed: true,
          is_receive: true,
          is_send: false,
          mtokens: undefined,
          out_channel: undefined,
          out_payment: undefined,
          timeout: undefined,
          tokens: undefined,
        },
      ],
      'Got target forward events');

      strictSame(remoteForwards, [
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: targetChannel.id,
          in_payment: 0,
          internal_failure: undefined,
          is_confirmed: true,
          is_failed: false,
          is_receive: true,
          is_send: false,
          mtokens: undefined,
          out_channel: undefined,
          out_payment: undefined,
          timeout: undefined,
          tokens: undefined,
        },
      ],
      'Got remote forward events');
    } else {
      strictSame(controlForwards, [
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: false,
          is_receive: false,
          is_send: true,
          mtokens: '101000',
          out_channel: controlChannel.id,
          out_payment: 0,
          timeout: height + 40 + 43,
          tokens: 101,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: true,
          is_failed: false,
          is_receive: false,
          is_send: true,
          mtokens: undefined,
          out_channel: controlChannel.id,
          out_payment: 0,
          timeout: undefined,
          tokens: undefined,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: false,
          is_receive: false,
          is_send: true,
          mtokens: '496431496',
          out_channel: controlChannel.id,
          out_payment: 1,
          timeout: height + 40 + 43,
          tokens: 496431,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: true,
          is_receive: false,
          is_send: true,
          mtokens: undefined,
          out_channel: controlChannel.id,
          out_payment: 1,
          timeout: undefined,
          tokens: undefined,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: false,
          is_receive: false,
          is_send: true,
          mtokens: '100000',
          out_channel: controlChannel.id,
          out_payment: 2,
          timeout: height + 43,
          tokens: 100,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: undefined,
          in_payment: undefined,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: true,
          is_receive: false,
          is_send: true,
          mtokens: undefined,
          out_channel: controlChannel.id,
          out_payment: 2,
          timeout: undefined,
          tokens: undefined,
        },
      ],
      'Got control forward events');

      strictSame(targetForwards, [
        {
          cltv_delta: 40,
          external_failure: undefined,
          fee: 1,
          fee_mtokens: '1000',
          in_channel: controlChannel.id,
          in_payment: 0,
          internal_failure: undefined,
          is_confirmed: false,
          is_failed: false,
          is_receive: false,
          is_send: false,
          mtokens: '100000',
          out_channel: targetChannel.id,
          out_payment: 0,
          timeout: height + 43,
          tokens: 100,
        },
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: controlChannel.id,
          in_payment: 0,
          internal_failure: undefined,
          is_confirmed: true,
          is_failed: false,
          is_receive: false,
          is_send: false,
          mtokens: undefined,
          out_channel: targetChannel.id,
          out_payment: 0,
          timeout: undefined,
          tokens: undefined,
        },
        {
          cltv_delta: 40,
          external_failure: 'TEMPORARY_CHANNEL_FAILURE',
          fee: 1,
          fee_mtokens: '1496',
          in_channel: controlChannel.id,
          in_payment: 1,
          internal_failure: 'INSUFFICIENT_BALANCE',
          is_confirmed: false,
          is_failed: true,
          is_receive: false,
          is_send: false,
          mtokens: '496430000',
          out_channel: targetChannel.id,
          out_payment: 0,
          timeout: height + 43,
          tokens: 496430,
        },
        {
          cltv_delta: undefined,
          external_failure: 'INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS',
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: controlChannel.id,
          in_payment: 2,
          internal_failure: 'INVOICE_NOT_OPEN',
          is_confirmed: false,
          is_failed: true,
          is_receive: true,
          is_send: false,
          mtokens: undefined,
          out_channel: undefined,
          out_payment: undefined,
          timeout: undefined,
          tokens: undefined,
        },
      ],
      'Got target forward events');

      strictSame(remoteForwards, [
        {
          cltv_delta: undefined,
          external_failure: undefined,
          fee: undefined,
          fee_mtokens: undefined,
          in_channel: targetChannel.id,
          in_payment: 0,
          internal_failure: undefined,
          is_confirmed: true,
          is_failed: false,
          is_receive: true,
          is_send: false,
          mtokens: undefined,
          out_channel: undefined,
          out_payment: undefined,
          timeout: undefined,
          tokens: undefined,
        },
      ],
      'Got remote forward events');
    }

    strictSame(controlErrors, [], 'No control errors');
    strictSame(targetErrors, [], 'No target errors');
    strictSame(remoteErrors, [], 'No remote errors');
  } catch (err) {
    strictSame(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return end();
});
