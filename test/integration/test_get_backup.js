const {deepStrictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getBackup} = require('./../../');
const {verifyBackup} = require('./../../');

const size = 2;

// Getting a channel backup should return a channel backup
test(`Get channel backup`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  const channel = await setupChannel({generate, lnd, to: target});

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
