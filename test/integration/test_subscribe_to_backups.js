const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {getChainBalance} = require('./../../');
const {openChannel} = require('./../../');
const {subscribeToBackups} = require('./../../');
const {verifyBackup} = require('./../../');
const {verifyBackups} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const giftTokens = 1e5;
const interval = 250;
const size = 2;
const times = 50;

// Subscribing to channel backups should trigger backup notifications
test(`Subscribe to backups`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {generate, lnd} = control;

  let channelOpen;
  const got = {};
  const sub = subscribeToBackups({lnd});

  sub.on('error', () => {});

  sub.on('backup', ({backup, channels}) => {
    got.backup = backup;

    return got.channels = channels;
  });

  await target.generate({count: 100});

  channelOpen = await asyncRetry({interval, times}, async () => {
    await addPeer({lnd, public_key: target.id, socket: target.socket});

    return await openChannel({
      lnd: target.lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: control.id,
      socket: control.socket,
    });
  });

  // Wait for generation to be over
  await asyncRetry({interval, times}, async () => {
    // Generate to confirm the tx
    await generate({});

    if (!got.channels) {
      throw new Error('ExpectedBackupWithChannelsData');
    }

    return;
  });

  const [channel] = got.channels;

  const multiVerification = await verifyBackups({
    lnd,
    backup: got.backup,
    channels: [{
      transaction_id: channelOpen.transaction_id,
      transaction_vout: channelOpen.transaction_vout,
    }],
  });

  strictEqual(multiVerification.is_valid, true, 'Multiple backups are valid');

  const singleVerification = await verifyBackup({
    lnd,
    backup: channel.backup,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  strictEqual(singleVerification.is_valid, true, 'Single backup is valid');

  await kill({});

  return;
});
