const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getBackup} = require('./../../');
const {setupChannel} = require('./../macros');
const {verifyBackup} = require('./../../');

const size = 2;

// Getting a channel backup should return a channel backup
test(`Get channel backup`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const channel = await setupChannel({
    generate: control.generate,
    lnd: control.lnd,
    to: target,
  });

  const {backup} = await getBackup({
    lnd: control.lnd,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  equal(!!backup, true, 'Channel backup is returned');

  const channelBackup = await verifyBackup({
    backup,
    lnd: control.lnd,
    transaction_id: channel.transaction_id,
    transaction_vout: channel.transaction_vout,
  });

  equal(channelBackup.is_valid, true, 'Channel backup is a valid backup');

  await kill({});

  return end();
});
