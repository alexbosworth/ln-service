const {deepStrictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getBackup} = require('./../../');
const {verifyBackup} = require('./../../');

const capacity = 1e6;
const size = 2;

// Getting a channel backup should return a channel backup
test(`Get channel backup`, async () => {
  const {channels, kill, nodes} = await spawnLightningCluster({
    capacity,
    size,
  });

  const [{lnd}] = nodes;

  const [channel] = channels;

  const {backup} = await getBackup({
    lnd,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  deepStrictEqual(!!backup, true, 'Channel backup is returned');

  const channelBackup = await verifyBackup({
    backup,
    lnd,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  deepStrictEqual(channelBackup.is_valid, true, 'Is a valid backup');

  await kill({});

  return;
});
