const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getWalletInfo} = require('./../../');
const {stopDaemon} = require('./../../');

// Stopping the daemon should gracefully shut down the daemon
test(`Stop daemon`, async ({end, equal, fail}) => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  await stopDaemon({lnd});

  try {
    const walletInfo = await getWalletInfo({lnd});

    fail('Daemon should be offline');
  } catch (err) {
    const [code, message] = err;

    equal(code, 503, 'Error code indicates daemon offline');
    equal(message, 'FailedToConnectToDaemon', 'Error msg indicates offline');
  }

  await kill({});

  return end();
});
