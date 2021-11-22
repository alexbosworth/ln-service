const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {closeChannel} = require('./../../');
const {createCluster} = require('./../macros');
const {setupChannel} = require('./../macros');

const size = 2;

// Closing a channel should close the channel
test(`Close channel`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  // Force close channel using tx id and vout
  try {
    const channelOpen = await setupChannel({
      generate: control.generate,
      lnd: control.lnd,
      to: target,
    });

    const channelClose = await closeChannel({
      is_force_close: true,
      lnd: control.lnd,
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
      generate: control.generate,
      lnd: control.lnd,
      to: target,
    });

    const channelClose = await closeChannel({
      id: channelOpen.id,
      lnd: control.lnd,
    });

    equal(channelClose.transaction_id.length, 64, 'Coop close id is returned');
    equal(channelClose.transaction_vout, 0, 'Coop close tx vout returned');
  } catch (err) {
    equal(err, null, 'Expected no error coop closing');
  }

  await kill({});

  return end();
});
