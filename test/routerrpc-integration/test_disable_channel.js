const {equal} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {disableChannel} = require('./../../');
const {getChannel} = require('./../../');

const capacity = 1e6;
const size = 2;

// Disabling a channel should mark it as disabled
test(`Disable channel`, async () => {
  const {channels, kill, nodes} = await spawnLightningCluster({capacity, size});

  const [{id, lnd}] = nodes;

  const [channel] = channels;

  try {
    await disableChannel({
      lnd,
      transaction_id: channel.transaction_id,
      transaction_vout: channel.transaction_vout,
    });

    const details = await getChannel({lnd, id: channel.id});

    const policy = details.policies.find(policy => policy.public_key === id);

    equal(policy.is_disabled, true, 'Forwarding policy is disabled');
  } catch (err) {
    const [code] = err;

    equal(code, 501, 'Method not supported yet');
  }

  await kill({});

  return;
});
