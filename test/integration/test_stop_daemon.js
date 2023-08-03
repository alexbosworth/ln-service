const {exit} = require('node:process');
const {fail} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getWalletInfo} = require('./../../');
const {stopDaemon} = require('./../../');

// Stopping the daemon should gracefully shut down the daemon
test(`Stop daemon`, async t => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  t.after(() => exit());

  await stopDaemon({lnd});

  try {
    const walletInfo = await getWalletInfo({lnd});

    fail('Daemon should be offline');
  } catch (err) {
    const [code, message] = err;

    strictEqual(code, 503, 'Error code indicates daemon offline');
    strictEqual(message, 'FailedToConnectToDaemon', 'Error indicates offline');
  }

  await kill({});

  return;
});
