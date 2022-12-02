const {test} = require('@alexbosworth/tap');

const {connectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const all = promise => Promise.all(promise);
const nodes = [{watchers: true}, {tower: true}];

// Connecting to a watchtower should add a watchtower
test(`Connect watchtower`, async ({end, equal, fail, match}) => {
  let client;
  let tower;

  client = await spawnLnd({watchers: true});
  tower = await spawnLnd({tower: true});

  const info = (await getTowerServerInfo({lnd: tower.lnd})).tower;
  const {lnd} = client;

  const [socket] = info.sockets;

  try {
    await connectWatchtower({lnd, socket, public_key: info.public_key});

    const [watcher] = (await getConnectedWatchtowers({lnd})).towers;

    equal(watcher.is_active, true, 'Tower is active');
    equal(watcher.public_key, info.public_key, 'Tower public key added');
    equal(watcher.sessions.length, [].length, 'Tower has no sessions');
    equal(watcher.sockets.pop(), socket, 'Tower at socket added');
  } catch (err) {
    equal(err, null, 'Expects no error');
  }

  [client, tower].forEach(n => n.kill());

  await all([client, tower].map(({lnd}) => waitForTermination({lnd})));

  return end();
});
