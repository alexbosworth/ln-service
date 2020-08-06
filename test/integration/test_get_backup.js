const {test} = require('tap');

const {createCluster} = require('./../macros');
const {getBackup} = require('./../../');
const {setupChannel} = require('./../macros');
const {verifyBackup} = require('./../../');

// Getting a channel backup should return a channel backup
test(`Get channel backup`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const channel = await setupChannel({
    generate: cluster.generate,
    lnd: cluster.control.lnd,
    to: cluster.target,
  });

  const {backup} = await getBackup({
    lnd: cluster.control.lnd,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  equal(!!backup, true, 'Channel backup is returned');

  const channelBackup = await verifyBackup({
    backup,
    lnd: cluster.control.lnd,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  equal(channelBackup.is_valid, true, 'Channel backup is a valid backup');

  await cluster.kill({});

  return end();
});
