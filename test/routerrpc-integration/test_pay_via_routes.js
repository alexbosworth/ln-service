const {randomBytes} = require('crypto');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getInvoice} = require('./../../');
const {getRoutes} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {payViaRoutes} = require('./../../');
const {routeFromChannels} = require('./../../routing');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const mtokPadding = '000';
const regtestChain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const reserveRatio = 0.99;
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying via routes should successfully pay via routes
test(`Pay via routes`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;
  const remoteLnd = cluster.remote.lnd;
  const targetPubKey = cluster.target_node_public_key;

  const controlToTargetChannel = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  const controlToTargetChan = await waitForChannel({
    lnd,
    id: controlToTargetChannel.transaction_id,
  });

  const [channel] = (await getChannels({lnd})).channels;

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    is_private: true,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await waitForPendingChannel({
    lnd: cluster.target.lnd,
    id: targetToRemoteChannel.transaction_id,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  const targetToRemoteChan = await waitForChannel({
    lnd: cluster.target.lnd,
    id: targetToRemoteChannel.transaction_id,
  });

  const [remoteChannel] = (await getChannels({lnd: remoteLnd})).channels;

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  const invoice = await createInvoice({
    tokens,
    is_including_private_channels: true,
    lnd: cluster.remote.lnd,
  });

  const {id} = invoice;
  const {request} = invoice;

  const decodedRequest = await decodePaymentRequest({lnd, request});

  const {routes} = await getRoutes({
    lnd,
    destination: decodedRequest.destination,
    routes: decodedRequest.routes,
    tokens: invoice.tokens,
  });

  const {destination} = decodedRequest;
  const [route] = routes;

  // Pay invoice, but with an invalid id
  try {
    await payViaRoutes({lnd, routes});
  } catch (err) {
    const [code, message, {failures}] = err;

    equal(code, 404, 'Invoice is unknown');
    equal(message, 'UnknownPaymentHash', 'Payment hash not recognized');

    const [failure] = failures;

    deepIs(failure, [404, 'UnknownPaymentHash', {
      channel: undefined,
      mtokens: undefined,
      policy: null,
      public_key: destination,
      timeout_height: undefined,
      update: undefined,
    }]);
  }

  const toRemote = await getChannel({
    lnd: cluster.target.lnd,
    id: targetToRemoteChan.id,
  });

  toRemote.policies.forEach(n => n.base_fee_mtokens = '0');

  const insufficientFeeRoute = routeFromChannels({
    channels: [await getChannel({lnd, id: controlToTargetChan.id}), toRemote],
    cltv: 40,
    destination: decodedRequest.destination,
    height: (await getWalletInfo({lnd})).current_block_height,
    mtokens: '100000',
  });

  try {
    await payViaRoutes({id, lnd, routes: [insufficientFeeRoute.route]});
  } catch (err) {
    const [lowFeeErrCode, lowFeeErrMessage, {failures}] = err;

    const [[,, details]] = failures;

    let flags = !details.policy.is_disabled ? 0 : 1;

    if (cluster.target_node_public_key > cluster.remote_node_public_key) {
      flags = !flags ? 1 : 0;
    }

    equal(lowFeeErrCode, 503, 'Low fee returns low fee error code');
    equal(details.channel, toRemote.id, 'Fwd channel id returned');
    equal(details.policy.base_fee_mtokens, '1000', 'Base fee');
    equal(details.policy.cltv_delta, 40, 'CLTV delta returned');
    equal(details.policy.fee_rate, 1, 'Fee rate returned');
    equal(details.policy.is_disabled, false, 'Channel is enabled');
    equal(details.policy.min_htlc_mtokens, '1000', 'Min HTLC tokens');
    equal(!!details.policy.updated_at, true, 'Updated at returned');
    equal(details.public_key, targetPubKey, 'Low fee for pubkey');
    equal(details.update.chain, regtestChain, 'Chain is returned');
    equal(details.update.channel_flags, flags, 'Channel flags');
    equal(details.update.extra_opaque_data, '', 'Opaque data');
    equal(details.update.message_flags, 1, 'Message flags');
    equal(details.update.signature.length, 128, 'Signature length');
    equal(lowFeeErrMessage, 'FeeInsufficient', 'Low fee returns low fee msg');
  }

  const payment = await payViaRoutes({id, lnd, routes});

  const paidInvoice = await getInvoice({id, lnd: cluster.remote.lnd});

  equal(paidInvoice.secret, invoice.secret, 'Paying invoice got secret');
  equal(paidInvoice.is_confirmed, true, 'Private invoice is paid');

  await cluster.kill({});

  return end();
});
