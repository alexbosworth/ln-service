const {test} = require('@alexbosworth/tap');

const {cancelPendingChannel} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getPendingChannels} = require('./../../');
const {openChannels} = require('./../../');

const capacity = 1e6;
const race = promises => Promise.race(promises);
const timeout = 1000 * 10;

// Cancel a channel should result in no pending channels
test(`Cancel pending channel`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channels = [{capacity, partner_public_key: cluster.target.public_key}];

  const toCancel = await race([delay(timeout), openChannels({channels, lnd})]);

  // Externally funding channels is not supported on LND 0.9.2 and below
  if (!!toCancel) {
    const [{id}] = toCancel.pending;

    await cancelPendingChannel({id, lnd});

    const pending = (await getPendingChannels({lnd})).pending_channels;

    equal(pending.length, [].length, 'Channel canceled');
  }

  await cluster.kill({});

  return end();
});
