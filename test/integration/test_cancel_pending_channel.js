const asyncEach = require('async/each');
const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {cancelPendingChannel} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getChainBalance} = require('./../../');
const {openChannels} = require('./../../');

const capacity = 1e6;
const count = 100;
const interval = 100;
const race = promises => Promise.race(promises);
const size = 2;
const timeout = 1000 * 5;
const times = 200;

// Cancel a channel should result in no pending channels
test(`Cancel pending channel`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {lnd} = control;

  await control.generate({count});

  await addPeer({lnd, public_key: target.id, socket: target.socket});

  const channels = [{capacity, partner_public_key: target.id}];

  await asyncRetry({interval, times}, async () => {
    const toCancel = await race([
      delay(timeout),
      openChannels({channels, lnd}),
    ]);

    const [{id}] = toCancel.pending;

    await cancelPendingChannel({id, lnd});
  });

  await kill({});

  return end();
});
