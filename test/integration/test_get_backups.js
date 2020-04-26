const asyncRetry = require('async/retry');
const {test} = require('tap');

const {createCluster} = require('./../macros');
const {getBackups} = require('./../../');
const {setupChannel} = require('./../macros');

// Getting a set of channel backups should return channel backups
test(`Get channel backup`, async ({end, equal}) => {
  await asyncRetry({}, async () => {
    const cluster = await createCluster({is_remote_skipped: true});

    const {lnd} = cluster.control;

    const channel = await setupChannel({
      lnd,
      generate: cluster.generate,
      to: cluster.target,
    });

    const {backup, channels} = await getBackups({lnd});

    equal(!!backup, true, 'Multi-backup blob is returned');
    equal(channels.length, [channel].length, 'Individualized channel backup');

    const [chanBackup] = channels;

    equal(!!chanBackup.backup.length, true, 'Channel backup has its own blob');
    equal(chanBackup.transaction_id, channel.transaction_id, 'Chan tx id given');
    equal(chanBackup.transaction_vout, channel.transaction_vout, 'Chan vout');

    await cluster.kill({});

    return;
  });

  return end();
});
