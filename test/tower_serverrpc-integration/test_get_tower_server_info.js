const {equal} = require('node:assert').strict;
const {match} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getTowerServerInfo} = require('./../../');

const conf = ['--watchtower.active'];

// Getting the tower server info should return tower server info
test(`Get tower server info`, async () => {
  const {kill, nodes} = await spawnLightningCluster({lnd_configuration: conf});

  const [{lnd}] = nodes;

  const {tower} = await getTowerServerInfo({lnd});

  equal(tower.sockets.length, 1, 'Tower sockets returned');

  const [socket] = tower.sockets;

  match(socket, /127.0.0.1\:\d\d\d\d/, 'Tower socket returned');

  equal(tower.public_key.length, 66, 'Public key returned');

  const [uri] = tower.uris;

  equal(uri, `${tower.public_key}@${socket}`, 'Got back socket');

  await kill({});

  return;
});
