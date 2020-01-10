const {test} = require('tap');

const {connectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {updateConnectedWatchtower} = require('./../../');
const {waitForTermination} = require('./../macros');

const all = promise => Promise.all(promise);
const includes = (arr, element) => !!arr.find(n => n === element);
const loopback = '[::1]';
const nodes = [{watchers: true}, {tower: true}];

// Updating a connected watchtower should update the watchtower
test(`Update connected watchtower`, async ({end, equal, match}) => {
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

  const [port] = socket.split(':').reverse();

  await connectWatchtower({lnd, socket, public_key: info.public_key});

  const [watcher] = (await getConnectedWatchtowers({lnd})).towers;

  const alternativeSocket = `${loopback}:${port}`;

  await updateConnectedWatchtower({
    lnd,
    add_socket: alternativeSocket,
    public_key: info.public_key,
  });

  const [added] = (await getConnectedWatchtowers({lnd})).towers;

  equal(includes(added.sockets, alternativeSocket), true, 'Added alt socket');

  await updateConnectedWatchtower({
    lnd,
    public_key: info.public_key,
    remove_socket: alternativeSocket,
  });

  const [removed] = (await getConnectedWatchtowers({lnd})).towers;

  equal(includes(removed.sockets, alternativeSocket), false, 'Removed socket');

  [client, tower].forEach(n => n.kill());

  await all([client, tower].map(({lnd}) => waitForTermination({lnd})));

  return end();
});
