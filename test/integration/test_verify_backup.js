const {test} = require('tap');

const {createCluster} = require('./../macros');
const getBackup = require('./../../getBackup');
const getWalletInfo = require('./../../getWalletInfo');
const openChannel = require('./../../openChannel');
const {spawnLnd} = require('./../macros');
const verifyBackup = require('./../../verifyBackup');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const defaultFee = 1e3;
const giftTokens = 1e5;

// Verifying a channel backup should show the backup is valid
test(`Test verify backup`, async ({end, equal}) => {
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

  await waitForPendingChannel({
    id: channelOpen.transaction_id,
    lnd: cluster.target.lnd,
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
    backup: backup.slice([backup].length),
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  equal(badBackup.is_valid, false, 'Invalid channel backup is invalid');
  equal(goodBackup.is_valid, true, 'Channel backup is validated');

  await cluster.kill({});

  return end();
});
