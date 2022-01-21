const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {connectWatchtower} = require('./../../');
const {disconnectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const all = promise => Promise.all(promise);
const interval = 200;
const nodes = [{watchers: true}, {tower: true}];
const times = 1000;

// Disconnecting a watchtower should remove a watchtower
test(`Disconnect watchtower`, async ({end, equal, match}) => {
  let client;
  let tower;

  client = await spawnLnd({watchers: true});
  tower = await spawnLnd({tower: true});

  const info = (await getTowerServerInfo({lnd: tower.lnd})).tower;
  const {lnd} = client;

  const [socket] = info.sockets;

  await connectWatchtower({lnd, socket, public_key: info.public_key});

  const [watcher] = (await getConnectedWatchtowers({lnd})).towers;

  equal(watcher.is_active, true, 'Tower is active');

  await asyncRetry({interval, times}, async () => {
    return await disconnectWatchtower({lnd, public_key: info.public_key});
  });

  const [disconnected] = (await getConnectedWatchtowers({lnd})).towers;

  equal(disconnected.is_active, false, 'Tower is inactive');

  [client, tower].forEach(n => n.kill());

  await all([client, tower].map(({lnd}) => waitForTermination({lnd})));

  return end();
});
