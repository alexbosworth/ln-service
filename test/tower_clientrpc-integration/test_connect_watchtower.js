const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {connectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {getWalletInfo} = require('./../../');

const conf = ['--watchtower.active', '--wtclient.active'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const interval = 50;
const size = 2;
const times = 5000;

// Connecting to a watchtower should add a watchtower
test(`Connect watchtower`, async () => {
  const {kill, nodes} = await spawnLightningCluster({
    size,
    lnd_configuration: conf
  });

  const [{generate, lnd}, target] = nodes;

  await asyncRetry({interval, times}, async () => {
    const wallet = await getWalletInfo({lnd});

    await generate({});

    if (!wallet.is_synced_to_chain) {
      throw new Error('NotSyncedToChain');
    }
  });

  try {
    const {tower} = await getTowerServerInfo({lnd: target.lnd});

    const [socket] = tower.sockets;

    // LND 0.19.0 requires a wait before connecting
    await delay(5000);

    await connectWatchtower({lnd, socket, public_key: tower.public_key});

    const [watcher] = (await getConnectedWatchtowers({lnd})).towers;

    equal(watcher.is_active, true, 'Tower is active');
    equal(watcher.public_key, tower.public_key, 'Tower public key added');
    equal(watcher.sessions.length, [].length, 'Tower has no sessions');
    equal(watcher.sockets.pop(), socket, 'Tower at socket added');
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
