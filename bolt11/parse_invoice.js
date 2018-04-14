const {address} = require('bitcoinjs-lib');
const {crypto} = require('bitcoinjs-lib');
const {decode} = require('bech32');
const {ECPair} = require('bitcoinjs-lib');
const {recover} = require('secp256k1');

const hrpAsTokens = require('./hrp_as_tokens');
const invoiceExpiration = require('./invoice_expiration');
const wordsAsAddress = require('./words_as_address');
const wordsAsNumber = require('./words_as_number');
const wordsAsBuffer = require('./words_as_buffer');

const bech32CurrencyCodes = require('./conf/bech32_currency_codes');
const taggedFields = require('./conf/tagged_fields');

const defaultExpirationMs = 3600000;
const descriptionHashByteLength = 32;
const {fromPublicKeyBuffer} = address;
const lnPrefix = 'ln';
const msPerSec = 1e3;
const paymentHashByteLength = 32;
const recoveryFlagByteLength = 1;
const recoveryFlags = [0, 1, 2, 3];
const {sha256} = crypto;
const sigByteLength = 64;
const sigWordsCount = 104;
const tagLengthWordLen = 2;
const tagNameWordLength = 1;
const timestampWordLength = 7;

/** Parse a BOLT 11 invoice into its component data

  Note: either description or description_hash will be returned

  {
    invoice: <BOLT 11 Invoice String>
  }

  @throws
  <Error> on parse invoice failure

  @returns
  {
    [chain_address]: <Fallback Chain Address String>
    created_at: <Invoice Creation Date ISO 8601 String>
    [description]: <Payment Description String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Request Hash String>
    is_expired: <Invoice is Expired Bool>
    network: <Network Name String>
    [tokens]: <Requested Tokens Number>
  }
*/
module.exports = ({invoice}) => {
  if (invoice.slice(0, lnPrefix.length) !== lnPrefix) {
    throw new Error('ExpectedLnPrefix');
  }

  const {prefix, words} = decode(invoice, Number.MAX_SAFE_INTEGER);

  // Separate the signature words (fixed length) from the rest of the data
  const sigWords = words.slice(-sigWordsCount);
  const wordsWithoutSig = words.slice(0, -sigWordsCount);

  let sigBuffer;
  const trim = true;

  try {
    sigBuffer = wordsAsBuffer({trim, words: sigWords});
  } catch (e) {
    throw e;
  }

  // There is a recovery flag at the end of the signature buffer
  const [recoveryFlag] = sigBuffer.slice(-recoveryFlagByteLength);

  // Eliminate the recovery flag from the signature buffer
  sigBuffer = sigBuffer.slice(0, -recoveryFlagByteLength);

  if (!(recoveryFlag in recoveryFlags) || sigBuffer.length !== sigByteLength) {
    throw new Error('InvalidOrMissingSignature');
  }

  // Without reverse lookups, can't say that the multipier at the end must
  // have a number before it, so instead we parse, and if the second group
  // doesn't have anything, there's a good chance the last letter of the
  // coin type got captured by the third group, so just re-regex without
  // the number.
  let prefixMatches = prefix.match(/^ln(\S+?)(\d*)([a-zA-Z]?)$/)

  if (prefixMatches && !prefixMatches[2]) {
    prefixMatches = prefix.match(/^ln(\S+)$/);
  }

  if (!prefixMatches) {
    throw new Error('InvalidInvoicePrefix');
  }

  const [{}, currencyCode, value, valueDivisor] = prefixMatches;

  const network = bech32CurrencyCodes[currencyCode];

  if (!network) {
    throw new Error('UnknownCurrencyCode');
  }

  let tokens;

  try {
    tokens = !value ? null : hrpAsTokens({hrp: `${value}${valueDivisor}`});
  } catch (e) {
    throw new Error('ExpectedValidHrp');
  }

  const timestampWords = words.slice(0, timestampWordLength);

  // Timestamp - left padded 0 bits
  const timestampMs = wordsAsNumber({words: timestampWords}) * msPerSec;

  const createdAt = new Date(timestampMs).toISOString();

  // Cut off the timestamp words
  let wordsWithTags = words.slice(timestampWordLength)

  let chainAddress;
  let description;
  let expiresAt = invoiceExpiration({created_at: createdAt});
  let paymentHash;
  const pubKeyFromBuf = fromPublicKeyBuffer;
  let tagLen;
  let tagName;
  let tagWords;

  while (!!wordsWithTags.length) {
    tag = taggedFields[wordsWithTags[0]];

    // Cut off the tag name word
    wordsWithTags = wordsWithTags.slice(tagNameWordLength);

    // Determine the tag's word length
    tagLen = wordsAsNumber({words: wordsWithTags.slice(0, tagLengthWordLen)});

    // Cut off the tag data_length
    wordsWithTags = wordsWithTags.slice(tagLengthWordLen);

    tagWords = wordsWithTags.slice(0, tagLen);

    // Cut off the tag words
    wordsWithTags = wordsWithTags.slice(tagLen);

    if (!tag) {
      continue;
    }

    switch (tag.name) {
    case 'd': // Description of Payment
      try {
        description = wordsAsBuffer({trim, words: tagWords});
      } catch (e) {
        throw new Error('InvalidDescription');
      }
      break;

    case 'f': // Fallback Address
      try {
        chainAddress = wordsAsAddress({network, words: tagWords});
      } catch (e) {
        throw new Error('InvalidFallbackAddress');
      }
      break;

    case 'p': // Payment Hash
      if (!!paymentHash) {
        continue;
      }

      try {
        paymentHash = wordsAsBuffer({trim, words: tagWords});
      } catch (e) {
        throw new Error('FailedToParsePaymentHash');
      }

      if (paymentHash.length !== paymentHashByteLength) {
        throw new Error('InvalidPaymentHashByteLength');
      }
      break;

    case 'x': // Expiration Seconds
      expiresAt = invoiceExpiration({created_at: createdAt, words: tagWords});
      break;

    default: // Ignore unparsed tags
      break;
    }
  }

  if (!paymentHash) {
    throw new Error('ExpectedPaymentHash');
  }

  const hashToSign = sha256(
    Buffer.concat([
      Buffer.from(prefix, 'utf8'),
      wordsAsBuffer({words: wordsWithoutSig}),
    ])
  );

  const destination = recover(hashToSign, sigBuffer, recoveryFlag, true);

  return {
    network,
    chain_address: chainAddress || undefined,
    created_at: createdAt,
    description: !!description ? description.toString('utf8') : undefined,
    destination: destination.toString('hex'),
    expires_at: expiresAt,
    id: paymentHash.toString('hex'),
    is_expired: expiresAt < new Date().toISOString(),
    tokens: tokens,
  };
};

