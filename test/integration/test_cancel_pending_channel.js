const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {cancelPendingChannel} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {openChannels} = require('./../../');

const capacity = 1e6;
const race = promises => Promise.race(promises);
const timeout = 1000 * 10;

// Cancel a channel should result in no pending channels
test(`Cancel pending channel`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channels = [{capacity, partner_public_key: cluster.target.public_key}];

  await asyncRetry({interval: 100, times: 100}, async () => {
    const toCancel = await race([
      delay(timeout),
      openChannels({channels, lnd}),
    ]);

    const [{id}] = toCancel.pending;

    await cancelPendingChannel({id, lnd});
  });

  await cluster.kill({});

  return end();
});
