const {test} = require('tap');

const getWalletInfo = require('./../../getWalletInfo');
const {spawnLnd} = require('./../macros');
const stopDaemon = require('./../../stopDaemon');

// Stopping the daemon should gracefully shut down the daemon
test(`Stop daemon`, async ({end, equal, fail}) => {
  const {kill, lnd} = await spawnLnd({});

  await stopDaemon({lnd});

  try {
    const walletInfo = await getWalletInfo({lnd});

    fail('Daemon should be offline');
  } catch (err) {
    const [code, message] = err;

    equal(code, 503, 'Error code indicates daemon offline');
    equal(message, 'FailedToConnectToDaemon', 'Error msg indicates offline');
  }

  kill();

  return end();
});

