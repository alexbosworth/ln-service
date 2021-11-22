const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getBackups} = require('./../../');
const {setupChannel} = require('./../macros');
const {verifyBackups} = require('./../../');

const channelCapacityTokens = 1e6;
const giftTokens = 1e5;
const size = 2;

// Verifying backups should show the backups are valid
test(`Test verify backups`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {generate, lnd} = control;

  const channelOpen = await setupChannel({
    generate,
    lnd: target.lnd,
    generate: target.generate,
    give: giftTokens,
    to: control,
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

  await kill({});

  return end();
});
