const {test} = require('tap');

const {createCluster} = require('./../macros');
const {getBackups} = require('./../../');
const {openChannel} = require('./../../');
const {waitForPendingChannel} = require('./../macros');

// Getting a set of channel backups should return channel backups
test(`Get channel backup`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channel = await openChannel({
    lnd,
    local_tokens: 1e6,
    partner_public_key: cluster.target.public_key,
    socket: cluster.target.socket,
  });

  await waitForPendingChannel({lnd, id: channel.transaction_id});

  const {backup, channels} = await getBackups({lnd});

  equal(!!backup, true, 'Multi-backup blob is returned');
  equal(channels.length, [channel].length, 'Individualized channel backup');

  const [chanBackup] = channels;

  equal(!!chanBackup.backup.length, true, 'Channel backup has its own blob');
  equal(chanBackup.transaction_id, channel.transaction_id, 'Chan tx id given');
  equal(chanBackup.transaction_vout, channel.transaction_vout, 'Chan vout');

  await cluster.kill({});

  return end();
});
