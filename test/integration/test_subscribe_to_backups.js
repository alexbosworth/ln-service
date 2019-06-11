const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {spawnLnd} = require('./../macros');
const {subscribeToBackups} = require('./../../');
const {verifyBackup} = require('./../../');
const {verifyBackups} = require('./../../');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const giftTokens = 1e5;

// Subscribing to channel backups should trigger backup notifications
test(`Subscribe to backups`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  let channelOpen;
  const sub = subscribeToBackups({lnd: cluster.control.lnd});

  sub.on('error', () => {});

  sub.on('backup', async ({backup, channels}) => {
    const [channel] = channels;

    const multiVerification = await verifyBackups({
      backup,
      lnd,
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

    // Give blocks some time to be generated
    await delay(3000);

    await cluster.kill({});

    return end();
  });

  channelOpen = await openChannel({
    lnd: cluster.target.lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: giftTokens,
    local_tokens: channelCapacityTokens,
    partner_public_key: (await getWalletInfo({lnd})).public_key,
    socket: `${cluster.control.listen_ip}:${cluster.control.listen_port}`,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  return;
});
