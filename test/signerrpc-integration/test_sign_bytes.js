const {createHash} = require('node:crypto');
const {equal} = require('node:assert').strict;
const test = require('node:test');

const {decode} = require('bip66');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {verifySchnorr} = require('tiny-secp256k1');

const {createSignedRequest} = require('./../../');
const {createUnsignedRequest} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {signBytes} = require('./../../');

const bytes = Buffer.alloc(32);
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const sha256 = n => createHash('sha256').update(n).digest();
const tag = 'BIP0322-signed-message';
const utf8AsBuffer = utf8 => Buffer.from(utf8, 'utf8');
const xOnlyPublicKey = id => Buffer.from(id, 'hex').slice(1);

// Signing bytes should result in a signature for the bytes
test(`Sign bytes`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{id, lnd}] = nodes;

  try {
    const unsigned = createUnsignedRequest({
      description: 'description',
      destination: id,
      id: Buffer.alloc(32).toString('hex'),
      network: 'regtest',
    });

    const {signature} = await signBytes({
      lnd,
      key_family: 6,
      key_index: 0,
      preimage: unsigned.preimage,
    });

    equal(!!signature.length, true, 'Signature is returned');

    const {r, s} = decode(Buffer.from(signature, 'hex'));

    const rValue = r.length === 33 ? r.slice(1) : r;

    const {request} = createSignedRequest({
      destination: id,
      hrp: unsigned.hrp,
      signature: Buffer.concat([rValue, s]).toString('hex'),
      tags: unsigned.tags,
    });

    const decoded = await decodePaymentRequest({lnd, request});

    equal(decoded.destination, id, 'Encoded custom request');
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

    equal(schnorr.signature.length, 64 * 2, 'Got schnorr signature for bytes');
  } catch (err) {
    const [code, message] = Array.isArray(err) ? err : [];

    equal(code, 503, 'A 503 code is thrown if schnorr is unsupported');
    equal(message, 'UnexpectedSignatureLengthInSignBytesResponse', 'Sig len');
  }

  try {
    const tagged = await signBytes({
      lnd,
      tag,
      key_family: 6,
      key_index: 0,
      preimage: bytes.toString('hex'),
      type: 'schnorr',
    });

    equal(tagged.signature.length, 64 * 2, 'Got schnorr signature for tag');

    // The signature should be over the BIP-340 tagged hash of the bytes
    const tagHash = sha256(utf8AsBuffer(tag));

    const hash = sha256(Buffer.concat([tagHash, tagHash, bytes]));

    const signature = hexAsBuffer(tagged.signature);

    const isValid = verifySchnorr(hash, xOnlyPublicKey(id), signature);

    equal(isValid, true, 'Tagged hash signature is valid for x-only key');
  } catch (err) {
    const [code, message] = Array.isArray(err) ? err : [];

    equal(code, 503, 'A 503 code is thrown if tagged hashes are unsupported');
    equal(message, 'UnexpectedSignatureLengthInSignBytesResponse', 'Sig len');
  }

  await kill({});

  return;
});
