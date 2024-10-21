const {createHash} = require('node:crypto');
const {equal} = require('node:assert').strict;
const test = require('node:test');

const {decode} = require('bip66');
const {recover} = require('tiny-secp256k1');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {signBytes} = require('./../../');
const {verifyBytesSignature} = require('./../../');

const preimage = '00';
const recoveryFlags = [0, 1, 2, 3];
const sha256 = n => createHash('sha256').update(Buffer.from(n, 'hex'));

// Verifying signature over bytes should result in validity
test(`Verify bytes signature`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{id, lnd}] = nodes;

  try {
    const {signature} = await signBytes({
      lnd,
      preimage,
      key_family: 6,
      key_index: 0,
    });

    // Check the signature locally using ECDSA recovery
    const hash = sha256(preimage).digest();
    const {r, s} = decode(Buffer.from(signature, 'hex'));

    const rValue = r.length === 33 ? r.slice(1) : r;

    const realSig = Buffer.concat([rValue, s]);

    // Find the recovery flag that works for this signature
    const recoveryFlag = recoveryFlags.find(flag => {
      try {
        const key = Buffer.from(recover(hash, realSig, flag, true));

        return key.equals(Buffer.from(id, 'hex'));
      } catch (err) {
        return false;
      }
    });

    equal(recoveryFlag !== undefined, true, 'Signature is valid');

    // Ask the node for validity
    const validity = await verifyBytesSignature({
      lnd,
      preimage,
      signature,
      public_key: id,
    });

    equal(validity.is_valid, true, 'Signature is valid for public key');

    const invalid = await verifyBytesSignature({
      lnd,
      signature,
      preimage: '01',
      public_key: id,
    });

    equal(invalid.is_valid, false, 'Signature is not valid for preimage');
  } catch (err) {
    const [code, message] = Array.isArray(err) ? err : [];

    equal(code, 400, 'A 400 code is thrown if signer is absent');
    equal(message, 'ExpectedSignerRpcLndBuildTagToSignBytes', 'Invalid LND');
  }

  try {
    const schnorr = await signBytes({
      lnd,
      key_family: 6,
      key_index: 0,
      preimage: Buffer.alloc(32).toString('hex'),
      type: 'schnorr',
    });

    const validity = await verifyBytesSignature({
      lnd,
      preimage: Buffer.alloc(32).toString('hex'),
      public_key: id.slice(2),
      signature: schnorr.signature,
    });

    equal(validity.is_valid, true, 'Schnorr signature is valid');
  } catch (err) {
    const [code, message] = Array.isArray(err) ? err : [];

    equal(code, 503, 'A 503 code is thrown if schnorr is unsupported');
    equal(message, 'UnexpectedSignatureLengthInSignBytesResponse', 'Sig len');
  }

  await kill({});

  return;
});
