const {test} = require('@alexbosworth/tap');

const {closeChannel} = require('./../../');
const {createCluster} = require('./../macros');
const {setupChannel} = require('./../macros');

// Closing a channel should close the channel
test(`Close channel`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  // Force close channel using tx id and vout
  try {
    const channelOpen = await setupChannel({
      generate: cluster.generate,
      lnd: cluster.control.lnd,
      to: cluster.target,
    });

    const channelClose = await closeChannel({
      is_force_close: true,
      lnd: cluster.control.lnd,
      transaction_id: channelOpen.transaction_id,
      transaction_vout: channelOpen.transaction_vout,
    });

    equal(channelClose.transaction_id.length, 64, 'Force close id returned');
    equal(channelClose.transaction_vout, 0, 'Force close vout returned');
  } catch (err) {
    equal(err, null, 'Expected no error force closing');
  }

  // Coop close channel using the channel id
  try {
    const channelOpen = await setupChannel({
      generate: cluster.generate,
      lnd: cluster.control.lnd,
      to: cluster.target,
    });

    const channelClose = await closeChannel({
      id: channelOpen.id,
      lnd: cluster.control.lnd,
    });

    equal(channelClose.transaction_id.length, 64, 'Coop close id is returned');
    equal(channelClose.transaction_vout, 0, 'Coop close tx vout returned');
  } catch (err) {
    equal(err, null, 'Expected no error coop closing');
  }

  await cluster.kill({});

  return end();
});
