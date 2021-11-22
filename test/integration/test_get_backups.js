const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getBackups} = require('./../../');
const {setupChannel} = require('./../macros');

const size = 2;

// Getting a set of channel backups should return channel backups
test(`Get channel backup`, async ({end, equal}) => {
  await asyncRetry({}, async () => {
    const {kill, nodes} = await spawnLightningCluster({size});

    const [{generate, lnd}, target] = nodes;

    const channel = await setupChannel({generate, lnd, to: target});

    const {backup, channels} = await getBackups({lnd});

    equal(!!backup, true, 'Multi-backup blob is returned');
    equal(channels.length, [channel].length, 'Individualized channel backup');

    const [chanBackup] = channels;

    equal(!!chanBackup.backup.length, true, 'Channel backup has its own blob');
    equal(chanBackup.transaction_id, channel.transaction_id, 'Chan tx id');
    equal(chanBackup.transaction_vout, channel.transaction_vout, 'Chan vout');

    await kill({});

    return;
  });

  return end();
});
