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

  // The tower listens on all interfaces of its container
  match(socket, /\:\d\d\d\d$/, 'Tower socket returned');

  equal(tower.public_key.length, 66, 'Public key returned');

  const [uri] = tower.uris;

  // The URI has the external address, which is not the listening socket
  const [key] = uri.split('@');

  equal(key, tower.public_key, 'Got back URI of the tower');

  await kill({});

  return;
});
