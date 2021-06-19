const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {openChannel} = require('./../../');
const {spawnLnd} = require('./../macros');
const {subscribeToBackups} = require('./../../');
const {verifyBackup} = require('./../../');
const {verifyBackups} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const giftTokens = 1e5;
const interval = 250;
const times = 50;

// Subscribing to channel backups should trigger backup notifications
test(`Subscribe to backups`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  let channelOpen;
  const got = {};
  const sub = subscribeToBackups({lnd: cluster.control.lnd});

  sub.on('error', () => {});

  sub.on('backup', ({backup, channels}) => {
    got.backup = backup;
    return got.channels = channels;
  });

  channelOpen = await asyncRetry({interval, times}, async () => {
    return await openChannel({
      lnd: cluster.target.lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: cluster.control.public_key,
      socket: cluster.control.socket,
    });
  });

  // Wait for generation to be over
  await asyncRetry({interval, times}, async () => {
    // Generate to confirm the tx
    await cluster.generate({count: 1, node: cluster.control});

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

  equal(multiVerification.is_valid, true, 'Multiple backups are valid');

  const singleVerification = await verifyBackup({
    lnd,
    backup: channel.backup,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  equal(singleVerification.is_valid, true, 'Single backup is valid');

  await cluster.kill({});

  return end();
});
