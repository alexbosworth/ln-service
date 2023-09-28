const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {getChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {subscribeToOpenRequests} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const count = 100;
const dustLimit = 354;
const interval = 10;
const size = 2;
const times = 2000;

// Open a channel with a low channel reserve
test(`Open channel but allow a minimal channel reserve`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {id, lnd} = control;

  await target.generate({count});

  await addPeer({lnd, public_key: target.id, socket: target.socket});

  await asyncRetry({interval, times}, async () => {
    const wallet = await getWalletInfo({lnd: target.lnd});

    if (!wallet.is_synced_to_chain) {
      throw new Error('ExpectedWalletSyncedToChain');
    }
  });

  const acceptSub = subscribeToOpenRequests({lnd});

  acceptSub.on('channel_request', request => {
    request.accept({
      min_confirmations: 1,
      remote_csv: 999,
      remote_reserve: 354,
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
        is_private: true,
        is_allowing_minimal_reserve: true,
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

  const channel = await asyncRetry({interval, times}, async () => {
    const [channel] = (await getChannels({lnd})).channels;

    await control.generate({});

    if (!channel) {
      throw new Error('ExpectedChannelCreation');
    }

    return channel;
  });

  equal(channel.remote_reserve, dustLimit, 'Got minimal reserve value');

  await kill({});

  return;
});
