const asyncRetry = require('async/retry');
const {test} = require('tap');

const {createCluster} = require('./../macros');
const {getBackup} = require('./../../');
const {openChannel} = require('./../../');
const {verifyBackup} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const giftTokens = 1e5;
const interval = retryCount => 10 * Math.pow(2, retryCount);
const times = 20;

// Verifying a channel backup should show the backup is valid
test(`Test verify backup`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channelOpen = await (async () => {
    return await asyncRetry({interval, times}, async () => {
      return await openChannel({
        lnd: cluster.target.lnd,
        chain_fee_tokens_per_vbyte: defaultFee,
        give_tokens: giftTokens,
        local_tokens: channelCapacityTokens,
        partner_public_key: cluster.control.public_key,
        socket: cluster.control.socket,
      });
    });
  })();

  await waitForPendingChannel({
    id: channelOpen.transaction_id,
    lnd: cluster.target.lnd,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await waitForChannel({
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
    backup: backup.slice([backup, backup].length),
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  equal(badBackup.is_valid, false, 'Invalid channel backup is invalid');
  equal(goodBackup.is_valid, true, 'Channel backup is validated');

  await cluster.kill({});

  return end();
});
