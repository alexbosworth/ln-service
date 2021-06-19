const {test} = require('@alexbosworth/tap');

const {getTowerServerInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const pubKeyHexLength = Buffer.alloc(33).toString('hex').length;

// Getting the tower server info should return tower server info
test(`Get tower server info`, async ({end, equal, match}) => {
  const spawned = await spawnLnd({tower: true});

  const {lnd} = spawned;

  const {tower} = await getTowerServerInfo({lnd});

  equal(tower.sockets.length, 1, 'Tower sockets returned');

  const [socket] = tower.sockets;

  match(socket, /127.0.0.1\:\d\d\d\d/, 'Tower socket returned');

  equal(tower.public_key.length, pubKeyHexLength, 'Public key returned');

  const [uri] = tower.uris;

  equal(uri, `${tower.public_key}@${socket}`, 'Got back socket');

  spawned.kill();

  await waitForTermination({lnd});

  return end();
});
