const {test} = require('tap');

const {createCluster} = require('./../macros');
const {getBackup} = require('./../../');
const {openChannel} = require('./../../');
const {verifyBackup} = require('./../../');
const {waitForPendingChannel} = require('./../macros');

// Getting a channel backup should return a channel backup
test(`Get channel backup`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channel = await openChannel({
    lnd,
    local_tokens: 1e6,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({lnd, id: channel.transaction_id});

  const {backup} = await getBackup({
    lnd,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  equal(!!backup, true, 'Channel backup is returned');

  const channelBackup = await verifyBackup({
    backup,
    lnd,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  equal(channelBackup.is_valid, true, 'Channel backup is a valid backup');

  await cluster.kill({});

  return end();
});
