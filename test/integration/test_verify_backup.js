const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {getBackup} = require('./../../');
const {setupChannel} = require('./../macros');
const {verifyBackup} = require('./../../');

const giftTokens = 1e5;

// Verifying a channel backup should show the backup is valid
test(`Test verify backup`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channelOpen = await setupChannel({
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    give: giftTokens,
    to: cluster.control,
  });

  const {backup} = await getBackup({
    lnd,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  const goodBackup = await verifyBackup({
    backup,
    lnd,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  const badBackup = await verifyBackup({
    lnd,
    backup: backup.slice([backup, backup].length),
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  equal(badBackup.is_valid, false, 'Invalid channel backup is invalid');
  equal(goodBackup.is_valid, true, 'Channel backup is validated');

  await cluster.kill({});

  return end();
});
