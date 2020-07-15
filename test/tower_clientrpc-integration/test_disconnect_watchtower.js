const {test} = require('@alexbosworth/tap');

const {connectWatchtower} = require('./../../');
const {disconnectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const all = promise => Promise.all(promise);
const nodes = [{watchers: true}, {tower: true}];

// Disconnecting a watchtower should remove a watchtower
test(`Disconnect watchtower`, async ({end, equal, match}) => {
  let client;
  let tower;

  try {
    client = await spawnLnd({watchers: true});
    tower = await spawnLnd({tower: true});
  } catch (err) {
    const [, errMessage] = err;

    // LND 0.7.1 does not support wtclient
    if (errMessage === 'ExpectedLightningDaemon') {
      return end();
    }
  }

  const info = (await getTowerServerInfo({lnd: tower.lnd})).tower;
  const {lnd} = client;

  const [socket] = info.sockets;

  await connectWatchtower({lnd, socket, public_key: info.public_key});

  const [watcher] = (await getConnectedWatchtowers({lnd})).towers;

  equal(watcher.is_active, true, 'Tower is active');

  await disconnectWatchtower({lnd, public_key: info.public_key});

  const [disconnected] = (await getConnectedWatchtowers({lnd})).towers;

  equal(disconnected.is_active, false, 'Tower is inactive');

  [client, tower].forEach(n => n.kill());

  await all([client, tower].map(({lnd}) => waitForTermination({lnd})));

  return end();
});
