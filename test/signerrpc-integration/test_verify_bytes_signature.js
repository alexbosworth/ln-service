const {test} = require('tap');

const {signBytes} = require('./../../');
const {spawnLnd} = require('./../macros');
const {verifyBytesSignature} = require('./../../');
const {waitForTermination} = require('./../macros');

const preimage = '00';

// Verifying signature over bytes should result in validity
test(`Verify bytes signature`, async ({end, equal}) => {
  const spawned = await spawnLnd({});

  try {
    const {signature} = await signBytes({
      preimage,
      key_family: 6,
      key_index: 0,
      lnd: spawned.lnd,
    });

    const validity = await verifyBytesSignature({
      preimage,
      signature,
      lnd: spawned.lnd,
      public_key: spawned.public_key,
    });

    equal(validity.is_valid, true, 'Signature is valid for public key');

    const invalid = await verifyBytesSignature({
      signature,
      lnd: spawned.lnd,
      preimage: '01',
      public_key: spawned.public_key,
    });

    equal(invalid.is_valid, false, 'Signature is not valid for preimage');
  } catch (err) {
    const [code, message] = Array.isArray(err) ? err : [];

    equal(code, 400, 'A 400 code is thrown if signer is absent');
    equal(message, 'ExpectedSignerRpcLndBuildTagToSignBytes', 'Invalid LND');
  }

  spawned.kill();

  await waitForTermination({lnd: spawned.lnd});

  return end();
});
