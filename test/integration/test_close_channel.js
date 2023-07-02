const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {closeChannel} = require('./../../');

const size = 2;

// Closing a channel should close the channel
test(`Close channel`, async () => {
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

    strictEqual(channelClose.transaction_id.length, 64, 'Got force close id');
    strictEqual(channelClose.transaction_vout, 0, 'Force close vout returned');
  } catch (err) {
    strictEqual(err, null, 'Expected no error force closing');
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

    strictEqual(channelClose.transaction_id.length, 64, 'Got coop close id');
    strictEqual(channelClose.transaction_vout, 0, 'Got coop close tx vout');
  } catch (err) {
    strictEqual(err, null, 'Expected no error coop closing');
  }

  await kill({});

  return;
});
