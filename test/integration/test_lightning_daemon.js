const {test} = require('tap');

const {delay} = require('./../macros');
const {lightningDaemon} = require('./../../');
const getWalletInfo = require('./../../getWalletInfo');
const {spawnLnd} = require('./../macros');

const pubKeyHexLength = 66;

// Initiating the lightning daemon connection should give access to LND
test(`Lightning daemon`, async ({end, equal}) => {
  const spawned = await spawnLnd({});

  await delay(3000);

  const cert = Buffer.from(spawned.lnd_cert, 'base64');
  const macaroon = Buffer.from(spawned.lnd_macaroon, 'base64');

  const base64Lnd = lightningDaemon({
    cert: cert.toString('base64'),
    macaroon: macaroon.toString('base64'),
    socket: spawned.lnd_socket,
  });

  const hexLnd = lightningDaemon({
    cert: cert.toString('hex'),
    macaroon: macaroon.toString('hex'),
    socket: spawned.lnd_socket,
  });

  const base64Result = await getWalletInfo({lnd: base64Lnd});
  const hexResult = await getWalletInfo({lnd: hexLnd});

  equal(base64Result.public_key.length, pubKeyHexLength, 'Expected b64 info');
  equal(hexResult.public_key.length, pubKeyHexLength, 'Expected hex info');

  spawned.kill();

  await delay(3000);

  return end();
});

