const {connectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const conf = ['--watchtower.active', '--wtclient.active'];
const size = 2;

// Connecting to a watchtower should add a watchtower
test(`Connect watchtower`, async ({end, equal, fail, match}) => {
  const {kill, nodes} = await spawnLightningCluster({
    size,
    lnd_configuration: conf
  });

  const [{lnd}, target] = nodes;

  try {
    const {tower} = await getTowerServerInfo({lnd: target.lnd});

    const [socket] = tower.sockets;

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

  return end();
});
