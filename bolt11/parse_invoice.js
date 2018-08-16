const {createHash} = require('crypto');

const {decode} = require('bech32');
const {recover} = require('secp256k1');

const hrpAsTokens = require('./hrp_as_tokens');
const invoiceExpiration = require('./invoice_expiration');
const wordsAsNumber = require('./words_as_number');
const wordsAsBuffer = require('./words_as_buffer');

const bech32CurrencyCodes = require('./conf/bech32_currency_codes');
const taggedFields = require('./conf/tagged_fields');

const defaultCltvExpiry = 9;
const defaultExpirationMs = 3600000;
const descriptionHashByteLength = 32;
const lnPrefix = 'ln';
const msPerSec = 1e3;
const paymentHashByteLength = 32;
const recoveryFlagByteLength = 1;
const recoveryFlags = [0, 1, 2, 3];
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
    created_at: <Invoice Creation Date ISO 8601 String>
    [description]: <Payment Description String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Request Hash String>
    is_expired: <Invoice is Expired Bool>
    [mtokens]: <Requested Milli-Tokens Value String> (can exceed Number limit)
    network: <Network Name String>
    [tokens]: <Requested Chain Tokens Number> (note: can differ from mtokens)
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

  let tokens = null;
  let mtokens = null;

  try {
    if (value) {
      const tok = hrpAsTokens({hrp: `${value}${valueDivisor}`});
      mtokens = tok.mtokens;
      tokens = tok.tokens;
    }
  } catch (e) {
    throw new Error('ExpectedValidHrp');
  }

  const timestampWords = words.slice(0, timestampWordLength);

  // Timestamp - left padded 0 bits
  const timestampMs = wordsAsNumber({words: timestampWords}) * msPerSec;

  const createdAt = new Date(timestampMs).toISOString();

  // Cut off the timestamp words
  let wordsWithTags = words.slice(timestampWordLength)

  let cltvExpiry = defaultCltvExpiry;
  let description;
  let expiresAt;
  let paymentHash;
  let tagCode;
  let tagLen;
  let tagName;
  let tagWords;

  while (!!wordsWithTags.length) {
    tagCode = wordsWithTags.shift();

    // Determine the tag's word length
    tagLen = wordsAsNumber({
      words: [wordsWithTags.shift(), wordsWithTags.shift()],
    });

    tagWords = wordsWithTags.slice(0, tagLen);

    // Cut off the tag words
    wordsWithTags = wordsWithTags.slice(tagWords.length);

    switch ((taggedFields[tagCode] || {}).name) {
    case 'c': // CLTV expiry
      cltvExpiry = wordsAsNumber({words: tagWords});
      break;

    case 'd': // Description of Payment
      try {
        description = wordsAsBuffer({trim, words: tagWords});
      } catch (e) {
        throw new Error('InvalidDescription');
      }
      break;

    case 'p': // Payment Hash
      if (!!paymentHash) {
        break;
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
      try {
        expiresAt = invoiceExpiration({
          created_at: createdAt,
          words: tagWords
        });
      } catch (e) {
        expiredAt = null;
      }
      break;

    default: // Ignore unparsed tags
      break;
    }
  }

  expiresAt = expiresAt || invoiceExpiration({created_at: createdAt})

  if (!paymentHash) {
    throw new Error('ExpectedPaymentHash');
  }

  const hash = createHash('sha256').update(
    Buffer.concat([
      Buffer.from(prefix, 'utf8'),
      wordsAsBuffer({words: wordsWithoutSig}),
    ])
  );

  const destination = recover(hash.digest(), sigBuffer, recoveryFlag, true);

  return {
    network,
    created_at: createdAt,
    description: !!description ? description.toString('utf8') : undefined,
    destination: destination.toString('hex'),
    expires_at: expiresAt,
    id: paymentHash.toString('hex'),
    is_expired: expiresAt < new Date().toISOString(),
    tokens: tokens,
    mtokens: mtokens,
  };
};

