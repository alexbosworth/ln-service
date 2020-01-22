const {decode} = require('bip66');
const {test} = require('tap');

const {createSignedRequest} = require('./../../');
const {createUnsignedRequest} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {signBytes} = require('./../../');
const {spawnLnd} = require('./../macros');
const {stopDaemon} = require('./../../');
const {waitForTermination} = require('./../macros');

// Signing bytes should result in a signature for the bytes
test(`Sign bytes`, async ({end, equal}) => {
  const spawned = await spawnLnd({});

  try {
    const unsigned = createUnsignedRequest({
      description: 'description',
      destination: spawned.public_key,
      id: Buffer.alloc(32).toString('hex'),
      network: 'regtest',
    });

    const {signature} = await signBytes({
      key_family: 6,
      key_index: 0,
      lnd: spawned.lnd,
      preimage: unsigned.preimage,
    });

    equal(!!signature.length, true, 'Signature is returned');

    const {r, s} = decode(Buffer.from(signature, 'hex'));

    const rValue = r.length === 33 ? r.slice(1) : r;

    const {request} = createSignedRequest({
      destination: spawned.public_key,
      hrp: unsigned.hrp,
      signature: Buffer.concat([rValue, s]).toString('hex'),
      tags: unsigned.tags,
      tokens: 1,
    });

    const decoded = await decodePaymentRequest({request, lnd: spawned.lnd});

    equal(decoded.destination, spawned.public_key, 'Encoded custom request');
  } catch (err) {
    const [code, message] = Array.isArray(err) ? err : [];

    equal(code, 400, 'A 400 code is thrown if signer is absent');
    equal(message, 'ExpectedSignerRpcLndBuildTagToSignBytes', 'Invalid LND');
  }

  await stopDaemon({lnd: spawned.lnd});

  spawned.kill();

  await waitForTermination({lnd: spawned.lnd});

  return end();
});
