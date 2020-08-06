const {test} = require('tap');

const {createCluster} = require('./../macros');
const {getBackups} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {setupChannel} = require('./../macros');
const {spawnLnd} = require('./../macros');
const {verifyBackups} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const giftTokens = 1e5;

// Verifying backups should show the backups are valid
test(`Test verify backups`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channelOpen = await setupChannel({
    lnd: cluster.target.lnd,
    generate: cluster.generate,
    generator: cluster.target,
    give: giftTokens,
    to: cluster.control,
  });

  const {backup} = await getBackups({lnd});

  const goodBackup = await verifyBackups({
    backup,
    lnd,
    channels: [{
      transaction_id: channelOpen.transaction_id,
      transaction_vout: channelOpen.transaction_vout,
    }],
  });

  const badBackup = await verifyBackups({
    lnd,
    backup: backup.slice([backup, backup].length),
    channels: [{
      transaction_id: channelOpen.transaction_id,
      transaction_vout: channelOpen.transaction_vout,
    }],
  });

  equal(badBackup.is_valid, false, 'Invalid channels backup is invalid');
  equal(goodBackup.is_valid, true, 'Valid channels backup is validated');

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await cluster.kill({});

  return end();
});
