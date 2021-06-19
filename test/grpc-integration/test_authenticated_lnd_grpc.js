const {test} = require('@alexbosworth/tap');

const {authenticatedLndGrpc} = require('./../../');
const {getIdentity} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const pubKeyHexLength = 66;

// Initiating the lightning daemon connection should give access to LND
test(`Lightning daemon`, async ({end, equal}) => {
  const spawned = await spawnLnd({});

  const cert = Buffer.from(spawned.lnd_cert, 'base64');
  const macaroon = Buffer.from(spawned.lnd_macaroon, 'base64');

  const base64Lnd = authenticatedLndGrpc({
    cert: cert.toString('base64'),
    macaroon: macaroon.toString('base64'),
    socket: spawned.lnd_socket,
  });

  const hexLnd = authenticatedLndGrpc({
    cert: cert.toString('hex'),
    macaroon: macaroon.toString('hex'),
    socket: spawned.lnd_socket,
  });

  const base64Result = await getIdentity({lnd: base64Lnd.lnd});
  const hexResult = await getIdentity({lnd: hexLnd.lnd});

  equal(base64Result.public_key.length, pubKeyHexLength, 'Expected b64 info');
  equal(hexResult.public_key.length, pubKeyHexLength, 'Expected hex info');

  spawned.kill();

  await waitForTermination({lnd: spawned.lnd});

  return end();
});
