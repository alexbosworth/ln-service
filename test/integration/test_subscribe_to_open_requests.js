const {once} = require('events');

const asyncRetry = require('async/retry');
const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {spawnLnd} = require('./../macros');
const {subscribeToOpenRequests} = require('./../../');
const {verifyBackup} = require('./../../');
const {verifyBackups} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const dustLimit = 573;
const giftTokens = 1e5;
const interval = retryCount => 50 * Math.pow(2, retryCount);
const regtestGenesisHash = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const times = 10;

// Subscribing to open requests should trigger channel open notifications
test(`Subscribe to open requests`, async ({end, equal, fail}) => {
  const cluster = await createCluster({is_remote_skipped: true});
  let initError;

  const {lnd} = cluster.control;

  const failSub = subscribeToOpenRequests({lnd: cluster.control.lnd});

  failSub.on('error', n => initError = n);

  await delay(3000);

  // LND 0.7.1 does not support interactive channel acceptance
  if (initError && initError.message === 'ChannelAcceptanceNotSupported') {
    await cluster.kill({});

    return end();
  }

  failSub.on('channel_request', ({reject}) => reject());

  try {
    await openChannel({
      lnd: cluster.target.lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: cluster.control.public_key,
      socket: cluster.control.socket,
    });

    fail('Expected channel open failure');
  } catch (err) {
    equal(Array.isArray(err), true, 'The error is an array');

    if (Array.isArray(err)) {
      const [code, message, details] = err;

      equal(code, 503, 'Failure error code');
      equal(message, 'FailedToOpenChannel', 'Open channel failure message');
      equal(!!details, true, 'Raw details returned');
    }
  }

  failSub.removeAllListeners();

  const acceptSub = subscribeToOpenRequests({lnd: cluster.control.lnd});

  acceptSub.on('channel_request', request => {
    equal(request.capacity, channelCapacityTokens, 'Channel capacity tokens');
    equal(request.chain, regtestGenesisHash, 'Got chain in request');
    equal(request.commit_fee_tokens_per_vbyte, 50, 'Got commit fee tokens');
    equal(request.csv_delay, 144, 'CSV delay is returned');
    equal(!!request.id, true, 'A channel request id is returned');
    equal(request.local_balance, giftTokens, 'Gift tokens are returned');
    equal(request.local_reserve, channelCapacityTokens * 0.01, 'Got reserve');
    equal(request.max_pending_mtokens, '990000000', 'Got max mtok in flight');
    equal(request.max_pending_payments, 483, 'Got max pending payments');
    equal(request.min_chain_output, dustLimit, 'Dust limit tokens returned');
    equal(request.min_htlc_mtokens, '1', 'Got min htlc amount');
    equal(request.partner_public_key, cluster.target.public_key, 'Got pubkey');

    request.accept();

    return;
  });

  try {
    await openChannel({
      lnd: cluster.target.lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: cluster.control.public_key,
      socket: cluster.control.socket,
    });
  } catch (err) {
    equal(err, null, 'Expected no error when a channel is accepted');
  }

  acceptSub.removeAllListeners();

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await asyncRetry({interval, times}, async () => {
    await openChannel({
      lnd: cluster.target.lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: cluster.control.public_key,
      socket: cluster.control.socket,
    });

    return;
  });

  await cluster.kill({});

  end();

  return;
});
