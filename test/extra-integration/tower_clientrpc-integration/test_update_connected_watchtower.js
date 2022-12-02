const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {connectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {updateConnectedWatchtower} = require('./../../');
const {waitForTermination} = require('./../macros');

const all = promise => Promise.all(promise);
const includes = (arr, element) => !!arr.find(n => n === element);
const interval = 1000;
const loopback = '[::1]';
const nodes = [{watchers: true}, {tower: true}];
const times = 100;

// Updating a connected watchtower should update the watchtower
test(`Update connected watchtower`, async ({end, equal, match}) => {
  let client;
  let tower;

  client = await spawnLnd({watchers: true});
  tower = await spawnLnd({tower: true});

  const info = (await getTowerServerInfo({lnd: tower.lnd})).tower;
  const {lnd} = client;

  const [socket] = info.sockets;

  const [port] = socket.split(':').reverse();

  await connectWatchtower({lnd, socket, public_key: info.public_key});

  const [watcher] = (await getConnectedWatchtowers({lnd})).towers;

  const alternativeSocket = `${loopback}:${port}`;

  await asyncRetry({interval, times}, async () => {
    const [tower] = (await getConnectedWatchtowers({lnd})).towers;

    if (!tower.sessions.length) {
      throw new Error('ExpectedSession');
    }
  });

  await asyncRetry({}, async () => {
    await updateConnectedWatchtower({
      lnd,
      add_socket: alternativeSocket,
      public_key: info.public_key,
    });
  });

  const [added] = (await getConnectedWatchtowers({lnd})).towers;

  equal(includes(added.sockets, alternativeSocket), true, 'Added alt socket');

  await asyncRetry({}, async () => {
    await updateConnectedWatchtower({
      lnd,
      public_key: info.public_key,
      remove_socket: alternativeSocket,
    });
  });

  const [removed] = (await getConnectedWatchtowers({lnd})).towers;

  equal(includes(removed.sockets, alternativeSocket), false, 'Removed socket');

  [client, tower].forEach(n => n.kill());

  await all([client, tower].map(({lnd}) => waitForTermination({lnd})));

  return end();
});
