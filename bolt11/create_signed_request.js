const {createHash} = require('crypto');

const {ecdsaRecover} = require('secp256k1');
const {encode} = require('bech32');

const hexAsWords = require('./hex_as_words');
const wordsAsBuffer = require('./words_as_buffer');

const {isArray} = Array;
const {MAX_SAFE_INTEGER} = Number;
const padding = '0';
const recoveryFlags = [0, 1, 2, 3];

/** Assemble a signed payment request

  {
    destination: <Destination Public Key Hex String>
    hrp: <Request Human Readable Part String>
    signature: <Request Hash Signature Hex String>
    tags: [<Request Tag Word Number>]
  }

  @throws
  <Error>

  @returns
  {
    request: <BOLT 11 Encoded Payment Request String>
  }
*/
module.exports = ({destination, hrp, signature, tags}) => {
  if (!destination) {
    throw new Error('ExpectedDestinationForSignedPaymentRequest');
  }

  if (!hrp) {
    throw new Error('ExpectedHrpForSignedPaymentRequest');
  }

  if (!signature) {
    throw new Error('ExpectedRequestSignatureForSignedPaymentRequest');
  }

  try {
    hexAsWords({hex: signature});
  } catch (err) {
    throw new Error('ExpectedValidSignatureHexForSignedPaymentRequest');
  }

  if (!isArray(tags)) {
    throw new Error('ExpectedRequestTagsForSignedPaymentRequest');
  }

  const preimage = Buffer.concat([
    Buffer.from(hrp, 'ascii'),
    wordsAsBuffer({words: tags}),
  ]);

  const hash = createHash('sha256').update(preimage).digest();

  const destinationKey = Buffer.from(destination, 'hex');
  const sig = Buffer.from(signature, 'hex');

  // Find the recovery flag that works for this signature
  const recoveryFlag = recoveryFlags.find(flag => {
    try {
      const key = Buffer.from(ecdsaRecover(sig, flag, hash, true));

      return key.equals(destinationKey);
    } catch (err) {
      return false;
    }
  });

  if (recoveryFlag === undefined) {
    throw new Error('ExpectedValidSignatureForSignedPaymentRequest');
  }

  const sigWords = hexAsWords({hex: signature + padding + recoveryFlag}).words;

  const words = [].concat(tags).concat(sigWords);

  return {request: encode(hrp, words, MAX_SAFE_INTEGER)};
};
