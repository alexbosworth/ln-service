const {randomBytes} = require('crypto');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getInvoice} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {openChannel} = require('./../../');
const {payViaRoutes} = require('./../../');
const {routeFromChannels} = require('./../../');
const {setupChannel} = require('./../macros');
const {subscribeToForwardRequests} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const interval = 10;
const intermediateRecord = {type: '65536', value: '5678'};
const mtokPadding = '000';
const regtestChain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const reserveRatio = 0.99;
const size = 3;
const start = new Date().toISOString();
const times = 3000;
const tlvType = '67676';
const tlvValue = '010203';
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying via routes should successfully pay via routes
test(`Pay via routes`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  await generate({count: 400});

  const remoteLnd = remote.lnd;
  const targetPubKey = target.id;

  const channel = await setupChannel({generate, lnd, to: target});

  const targetToRemoteChan = await setupChannel({
    generate: target.generate,
    hidden: true,
    lnd: target.lnd,
    to: remote,
  });

  const [remoteChannel] = (await getChannels({lnd: remoteLnd})).channels;

  await target.generate({count: confirmationCount});

  await asyncRetry({interval, times}, async () => {
    const {request} = await createInvoice({
      tokens,
      is_including_private_channels: true,
      lnd: remote.lnd,
    });

    const {routes} = await decodePaymentRequest({lnd, request});

    if (!!routes.length) {
      return;
    }

    throw new Error('ExpectedRoutesOnInvoice');
  });

  const invoice = await createInvoice({
    tokens,
    is_including_private_channels: true,
    lnd: remote.lnd,
  });

  const {id} = invoice;
  const {request} = invoice;

  const decodedRequest = await decodePaymentRequest({lnd, request});

  await waitForRoute({
    lnd,
    destination: decodedRequest.destination,
    routes: decodedRequest.routes,
    tokens: invoice.tokens,
  });

  const {route} = await getRouteToDestination({
    lnd,
    destination: decodedRequest.destination,
    payment: invoice.payment,
    routes: decodedRequest.routes,
    tokens: invoice.tokens,
    total_mtokens: !!invoice.payment ? invoice.mtokens : undefined,
  });

  const {destination} = decodedRequest;

  // Pay invoice, but with an invalid id
  try {
    await payViaRoutes({lnd, routes: [route]});
  } catch (err) {
    const [code, message, {failures}] = err;

    equal(code, 404, 'Invoice is unknown');
    equal(message, 'UnknownPaymentHash', 'Payment hash not recognized');

    const [[failCode, failMessage, failDetails]] = failures;

    equal(failCode, 404, 'No known entity');
    equal(failMessage, 'UnknownPaymentHash', 'This is an unknown hash');
  }

  const toRemote = await getChannel({
    lnd: target.lnd,
    id: targetToRemoteChan.id,
  });

  toRemote.policies.forEach(n => n.base_fee_mtokens = '0');

  const insufficientFeeRoute = routeFromChannels({
    channels: [await getChannel({lnd, id: channel.id}), toRemote],
    cltv_delta: 40,
    destination: decodedRequest.destination,
    height: (await getHeight({lnd})).current_block_height,
    mtokens: '100000',
  });

  try {
    await payViaRoutes({id, lnd, routes: [insufficientFeeRoute.route]});
  } catch (err) {
    const [lowFeeErrCode, lowFeeErrMessage, {failures}] = err;

    const [[,, details]] = failures;

    let flags = !details.policy.is_disabled ? 0 : 1;

    if (target.id > remote.id) {
      flags = !flags ? 1 : 0;
    }

    if (details.index !== undefined) {
      equal(details.index, 1, 'Failure index returned');
    }

    equal(lowFeeErrCode, 503, 'Low fee returns low fee error code');
    equal(details.channel, toRemote.id, 'Fwd channel id returned');
    equal(details.policy.base_fee_mtokens, '1000', 'Base fee');
    equal(details.policy.cltv_delta, 40, 'CLTV delta returned');
    equal(details.policy.fee_rate, 1, 'Fee rate returned');
    equal(details.policy.is_disabled, false, 'Channel is enabled');
    equal(details.policy.min_htlc_mtokens, '1000', 'Min HTLC tokens');
    equal(!!details.policy.updated_at, true, 'Updated at returned');
    equal(details.update.chain, regtestChain, 'Chain is returned');
    equal(details.update.channel_flags, flags, 'Channel flags');
    equal(details.update.extra_opaque_data, '', 'Opaque data');
    equal(details.update.message_flags, 1, 'Message flags');
    equal(details.update.signature.length, 128, 'Signature length');
    equal(lowFeeErrMessage, 'FeeInsufficient', 'Low fee returns low fee msg');
  }

  const [hopToTarget] = route.hops;

  hopToTarget.messages = [intermediateRecord];

  route.messages = [{type: tlvType, value: tlvValue}];

  const sub = subscribeToForwardRequests({lnd: target.lnd});

  const forwardMessages = [];

  sub.on('forward_request', request => {
    request.messages.forEach(message => forwardMessages.push(message));

    return request.accept();
  });

  const payment = await payViaRoutes({id, lnd, routes: [route]});

  strictSame(forwardMessages, [intermediateRecord], 'Got intermediate record');

  equal(payment.confirmed_at > start, true, 'Paid has confirm date');

  const paidInvoice = await getInvoice({id, lnd: remote.lnd});

  if (!!paidInvoice.payments.length) {
    const [payment] = paidInvoice.payments;

    if (!!payment.messages.length) {
      const [message] = payment.messages;

      equal(message.type, tlvType, 'Got message type');
      equal(message.value, tlvValue, 'Got message value');
    }
  }

  equal(paidInvoice.secret, invoice.secret, 'Paying invoice got secret');
  equal(paidInvoice.is_confirmed, true, 'Private invoice is paid');

  await kill({});

  return end();
});
