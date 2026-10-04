const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getBackups} = require('./../../');

const capacity = 1e6;
const size = 2;

// Getting a set of channel backups should return channel backups
test(`Get channel backup`, async () => {
  await asyncRetry({}, async () => {
    const cluster = await spawnLightningCluster({capacity, size});

    const {kill, nodes} = cluster;

    const [{lnd}] = nodes;

    const [channel] = cluster.channels;

    const {backup, channels} = await getBackups({lnd});

    strictEqual(!!backup, true, 'Multi-backup blob is returned');
    strictEqual(channels.length, [channel].length, 'Individualized backup');

    const [chanBackup] = channels;

    strictEqual(!!chanBackup.backup.length, true, 'Channel backup has blob');
    strictEqual(chanBackup.transaction_id, channel.transaction_id, 'Chan id');
    strictEqual(chanBackup.transaction_vout, channel.transaction_vout, 'Vout');

    await kill({});

    return;
  });

  return;
});
