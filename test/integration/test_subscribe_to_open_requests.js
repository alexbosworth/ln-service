const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {getChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {subscribeToOpenRequests} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const count = 100;
const defaultFee = 1e3;
const dustLimit = 354;
const giftTokens = 1e5;
const interval = 10;
const regtestGenesisHash = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const size = 2;
const times = 2000;

// Subscribing to open requests should trigger channel open notifications
test(`Subscribe to open requests`, async ({end, equal, fail, ok}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target, remote] = nodes;

  const {id, lnd} = control;

  await target.generate({count});

  await addPeer({lnd, public_key: target.id, socket: target.socket});

  const {address} = await createChainAddress({lnd});
  const failSub = subscribeToOpenRequests({lnd});

  await asyncRetry({interval, times: 1000}, async () => {
    const wallet = await getWalletInfo({lnd: target.lnd});

    if (!wallet.is_synced_to_chain) {
      throw new Error('ExpectedWalletSyncedToChain');
    }
  });

  failSub.on('channel_request', ({reject}) => reject({reason: 'reason'}));

  try {
    await openChannel({
      lnd: target.lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: control.id,
      socket: control.socket,
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

  const acceptSub = subscribeToOpenRequests({lnd});

  acceptSub.on('channel_request', request => {
    // LND 0.11.1 and below defaulted the commit fee to a higher value
    if (request.commit_fee_tokens_per_vbyte !== 10) {
      equal(request.commit_fee_tokens_per_vbyte, 50, 'Got commit fee tokens');
    }

    equal(request.capacity, channelCapacityTokens, 'Channel capacity tokens');
    equal(request.chain, regtestGenesisHash, 'Got chain in request');
    equal(request.csv_delay, 144, 'CSV delay is returned');
    equal(!!request.id, true, 'A channel request id is returned');
    equal(request.is_private, true, 'Channel request is private');
    equal(request.local_balance, giftTokens, 'Gift tokens are returned');
    equal(request.local_reserve, channelCapacityTokens * 0.01, 'Got reserve');
    equal(request.max_pending_mtokens, '990000000', 'Got max mtok in flight');
    equal(request.max_pending_payments, 483, 'Got max pending payments');
    ok(request.min_chain_output >= dustLimit, 'Dust limit tokens returned');
    equal(request.min_htlc_mtokens, '1', 'Got min htlc amount');
    equal(request.partner_public_key, target.id, 'Got pubkey');

    request.accept({
      cooperative_close_address: address,
      min_confirmations: 1,
      remote_csv: 999,
      remote_reserve: 1000,
      remote_max_htlcs: 20,
      remote_max_pending_mtokens: '200000',
      remote_min_htlc_mtokens: '2000',
    });

    return;
  });

  try {
    await asyncRetry({interval, times}, async () => {
      return await openChannel({
        lnd: target.lnd,
        chain_fee_tokens_per_vbyte: defaultFee,
        give_tokens: giftTokens,
        is_private: true,
        local_tokens: channelCapacityTokens,
        partner_public_key: control.id,
        socket: control.socket,
      });
    });
  } catch (err) {
    equal(err, null, 'Expected no error when a channel is accepted');
  }

  acceptSub.removeAllListeners();

  await target.generate({count: confirmationCount});

  await asyncRetry({interval, times}, async () => {
    await openChannel({
      lnd: target.lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: control.id,
      socket: control.socket,
    });

    return;
  });

  const channel = await asyncRetry({interval, times}, async () => {
    const [channel] = (await getChannels({lnd})).channels;

    await control.generate({});

    if (!channel) {
      throw new Error('ExpectedChannelCreation');
    }

    return channel;
  });

  // LND 0.11.1 and below do not support accepting with a custom address
  if (!!channel.cooperative_close_address) {
    equal(channel.cooperative_close_address, address, 'Got custom address');
    equal(channel.remote_csv, 999, 'Got custom CSV delay');
    equal(channel.remote_reserve, 1000, 'Got custom remote reserve');
    equal(channel.remote_max_htlcs, 20, 'Got custom remote max htlcs');
    equal(channel.remote_max_pending_mtokens, '200000', 'Got custom max tok');
    equal(channel.remote_min_htlc_mtokens, '2000', 'Got custom min htlcsize');
  }

  await kill({});

  return end();
});
