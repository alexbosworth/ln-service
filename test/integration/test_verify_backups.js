const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const getBackups = require('./../../getBackups');
const getWalletInfo = require('./../../getWalletInfo');
const openChannel = require('./../../openChannel');
const {spawnLnd} = require('./../macros');
const verifyBackups = require('./../../verifyBackups');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const giftTokens = 1e5;

// Verifying backups should show the backups are valid
test(`Test verify backups`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channelOpen = await openChannel({
    lnd: cluster.target.lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: giftTokens,
    local_tokens: channelCapacityTokens,
    partner_public_key: (await getWalletInfo({lnd})).public_key,
    socket: `${cluster.control.listen_ip}:${cluster.control.listen_port}`,
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
    backup: backup.slice([backup].length),
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
