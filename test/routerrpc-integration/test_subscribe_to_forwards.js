const asyncRetry = require('async/retry');
const {test} = require('tap');

const {addPeer} = require('./../../');
const {cancelHodlInvoice} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToForwards} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const limit = 1;
const tokens = 100;

// Subscribing to forwards should show forwarding events
test('Subscribe to forwards', async ({deepIs, end, equal, rejects}) => {
  const cluster = await createCluster({});

  const testSub = subscribeToForwards({lnd: cluster.control.lnd});

  await setupChannel({
    generate: cluster.generate,
    lnd: cluster.control.lnd,
    to: cluster.target,
  });

  await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    give: 5e5,
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  await addPeer({
    lnd: cluster.control.lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket,
  });

  await delay(2000);

  const controlErrors = [];
  const controlForwards = [];
  const controlSub = subscribeToForwards({lnd: cluster.control.lnd});
  const targetErrors = [];
  const targetForwards = [];
  const targetSub = subscribeToForwards({lnd: cluster.target.lnd});
  const remoteErrors = [];
  const remoteForwards = [];
  const remoteSub = subscribeToForwards({lnd: cluster.remote.lnd});

  controlSub.on('error', err => controlErrors.push(err));
  controlSub.on('forward', forward => controlForwards.push(forward));
  targetSub.on('error', err => targetErrors.push(err));
  targetSub.on('forward', forward => targetForwards.push(forward));
  remoteSub.on('error', err => remoteErrors.push(err));
  remoteSub.on('forward', forward => remoteForwards.push(forward));

  // Pay the remote through the target
  await payViaPaymentRequest({
    lnd: cluster.control.lnd,
    request: (await createInvoice({lnd: cluster.remote.lnd, tokens})).request,
  });

  const [channel] = (await getChannels({lnd: cluster.remote.lnd})).channels;

  const tooMuchInvoice = await createInvoice({
    lnd: cluster.remote.lnd,
    tokens: channel.remote_balance,
  });

  await rejects(payViaPaymentRequest({
    lnd: cluster.control.lnd,
    request: tooMuchInvoice.request,
  }), [503, 'PaymentPathfindingFailedToFindPossibleRoute'], 'TempChan fail');

  const deadInvoice = await createInvoice({tokens, lnd: cluster.target.lnd});

  await cancelHodlInvoice({id: deadInvoice.id, lnd: cluster.target.lnd});

  await rejects(payViaPaymentRequest({
    lnd: cluster.control.lnd,
    request: deadInvoice.request,
  }), [503, 'PaymentRejectedByDestination'], 'Rejection fail');

  const [err] = controlErrors;

  if (!!err && err.details === 'unknown service routerrpc.Router') {
    await cluster.kill({});

    return end();
  }

  await asyncRetry({interval: 1000, times: 30}, async () => {
    if (controlForwards.length !== 6) {
      throw new Error('ExpectedFullListOfControlForwards');
    }

    return;
  });

  [controlSub, remoteSub, targetSub].forEach(n => n.removeAllListeners());

  [controlForwards, targetForwards, remoteForwards].forEach(forwards => {
    return forwards.forEach(n => delete n.at);
  });

  deepIs(controlForwards, [
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
      out_channel: '443x1x0',
      out_payment: 0,
      timeout: 537,
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
      out_channel: '443x1x0',
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
      out_channel: '443x1x0',
      out_payment: 1,
      timeout: 537,
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
      out_channel: '443x1x0',
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
      out_channel: '443x1x0',
      out_payment: 2,
      timeout: 497,
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
      out_channel: '443x1x0',
      out_payment: 2,
      timeout: undefined,
      tokens: undefined,
    },
  ],
  'Got control forward events');

  deepIs(targetForwards, [
    {
      cltv_delta: 40,
      external_failure: undefined,
      fee: 1,
      fee_mtokens: '1000',
      in_channel: '443x1x0',
      in_payment: 0,
      internal_failure: undefined,
      is_confirmed: false,
      is_failed: false,
      is_receive: false,
      is_send: false,
      mtokens: '100000',
      out_channel: '449x1x0',
      out_payment: 0,
      timeout: 497,
      tokens: 100,
    },
    {
      cltv_delta: undefined,
      external_failure: undefined,
      fee: undefined,
      fee_mtokens: undefined,
      in_channel: '443x1x0',
      in_payment: 0,
      internal_failure: undefined,
      is_confirmed: true,
      is_failed: false,
      is_receive: false,
      is_send: false,
      mtokens: undefined,
      out_channel: '449x1x0',
      out_payment: 0,
      timeout: undefined,
      tokens: undefined,
    },
    {
      cltv_delta: 40,
      external_failure: 'TEMPORARY_CHANNEL_FAILURE',
      fee: 1,
      fee_mtokens: '1490',
      in_channel: '443x1x0',
      in_payment: 1,
      internal_failure: 'INSUFFICIENT_BALANCE',
      is_confirmed: false,
      is_failed: true,
      is_receive: false,
      is_send: false,
      mtokens: '490850000',
      out_channel: '449x1x0',
      out_payment: 0,
      timeout: 497,
      tokens: 490850,
    },
    {
      cltv_delta: undefined,
      external_failure: 'INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS',
      fee: undefined,
      fee_mtokens: undefined,
      in_channel: '443x1x0',
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

  deepIs(remoteForwards, [
    {
      cltv_delta: undefined,
      external_failure: undefined,
      fee: undefined,
      fee_mtokens: undefined,
      in_channel: '449x1x0',
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

  deepIs(controlErrors, [], 'No control errors');
  deepIs(targetErrors, [], 'No target errors');
  deepIs(remoteErrors, [], 'No remote errors');

  await cluster.kill({});

  return end();
});
