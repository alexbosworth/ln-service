const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const getBackup = require('./../../getBackup');
const openChannel = require('./../../openChannel');

const confirmationCount = 20;

// Getting a channel backup should return a channel backup
test(`Get channel backup`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channel = await openChannel({
    lnd,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await delay(2000);

  const {backup} = await getBackup({
    lnd,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  equal(!!backup, true, 'Channel backup is returned');

  await cluster.kill({});

  return end();
});
