const {createHash} = require('crypto');

const {decode} = require('bech32');
const {recover} = require('secp256k1');

const bech32CurrencyCodes = require('./conf/bech32_currency_codes');
const hrpAsTokens = require('./hrp_as_tokens');
const paymentRequestExpiration = require('./payment_request_expiration');
const taggedFields = require('./conf/tagged_fields');
const wordsAsChainAddress = require('./words_as_chain_address');
const wordsAsHopHints = require('./words_as_hop_hints');
const wordsAsNumber = require('./words_as_number');
const wordsAsBuffer = require('./words_as_buffer');

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

/** Parse a BOLT 11 payment request into its component data

  Note: either description or description_hash will be returned

  {
    request: <BOLT 11 Payment Request String>
  }

  @throws
  <ExpectedLnPrefix Error>
  <ExpectedPaymentHash Error>
  <ExpectedPaymentRequest Error>
  <ExpectedValidHrp Error>
  <FailedToParsePaymentHash Error>
  <InvalidInvoicePrefix Error>
  <InvalidOrMissingSignature Error>
  <InvalidPaymentHashByteLength Error>
  <UnknownCurrencyCode Error>

  @returns
  {
    [chain_addresses]: [<Chain Address String>]
    cltv_delta: <CLTV Delta Number>
    created_at: <Invoice Creation Date ISO 8601 String>
    [description]: <Description String>
    [description_hash]: <Description Hash Hex String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Request Hash String>
    is_expired: <Invoice is Expired Bool>
    [mtokens]: <Requested Milli-Tokens Value String> (can exceed Number limit)
    network: <Network Name String>
    [routes]: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      channel_id: <Short Channel Id String>
      cltv_delta: <Final CLTV Expiration Blocks Delta Number>
      fee_rate: <Fee Rate Millitokens Per Million Number>
      public_key: <Public Key Hex String>
    }]
    [tokens]: <Requested Chain Tokens Number> (note: can differ from mtokens)
  }
*/
module.exports = ({request}) => {
  if (!request) {
    throw new Error('ExpectedPaymentRequest');
  }

  if (request.slice(0, lnPrefix.length) !== lnPrefix) {
    throw new Error('ExpectedLnPrefix');
  }

  const {prefix, words} = decode(request, Number.MAX_SAFE_INTEGER);

  // Separate the signature words (fixed length) from the rest of the data
  const sigWords = words.slice(-sigWordsCount);
  const wordsWithoutSig = words.slice(0, -sigWordsCount);

  let sigBuffer;
  const trim = true;

  try {
    sigBuffer = wordsAsBuffer({trim, words: sigWords});
  } catch (err) {
    throw err;
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

  const timestampWords = wordsWithoutSig.slice(0, timestampWordLength);

  // Timestamp - left padded 0 bits
  const timestampMs = wordsAsNumber({words: timestampWords}) * msPerSec;

  const createdAt = new Date(timestampMs).toISOString();

  // Cut off the timestamp words
  let wordsWithTags = wordsWithoutSig.slice(timestampWordLength)

  let chainAddresses;
  let cltvDelta = defaultCltvExpiry;
  let descHash;
  let description;
  let expiresAt;
  let paymentHash;
  let routes;
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
      cltvDelta = wordsAsNumber({words: tagWords});
      break;

    case 'd': // Description of Payment
      try {
        description = wordsAsBuffer({trim, words: tagWords}).toString('utf8');
      } catch (err) {
        throw new Error('InvalidDescription');
      }
      break;

    case 'f': // On-chain fallback address
      try {
        const words = tagWords;
        chainAddresses = chainAddresses || [];

        const address = wordsAsChainAddress({network, words}).chain_address;

        chainAddresses.push(address);
      } catch (err) {
        throw new Error('FailedToParseFallbackAddress');
      }
      break;

    case 'h': // Description of Payment Hash
      try {
        descHash = wordsAsBuffer({trim, words: tagWords}).toString('hex');
      } catch (err) {
        throw new Error('FailedToParseDescriptionHash');
      }
      break;

    case 'p': // Payment Hash
      if (!!paymentHash) {
        break;
      }

      try {
        paymentHash = wordsAsBuffer({trim, words: tagWords});
      } catch (err) {
        throw new Error('FailedToParsePaymentHash');
      }

      if (paymentHash.length !== paymentHashByteLength) {
        throw new Error('InvalidPaymentHashByteLength');
      }
      break;

    case 'r': // Route Hop Hints
      try {
        routes = wordsAsHopHints({words: tagWords}).routes;
      } catch (err) {
        throw new Error('FailedToParseRoutingHopHints');
      }
      break;

    case 'x': // Expiration Seconds
      try {
        const words = tagWords;

        expiresAt = paymentRequestExpiration({words, created_at: createdAt});
      } catch (err) {
        expiredAt = null;
      }
      break;

    default: // Ignore unparsed tags
      break;
    }
  }

  expiresAt = expiresAt || paymentRequestExpiration({created_at: createdAt});

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
    chain_addresses: chainAddresses || undefined,
    cltv_delta: cltvDelta || undefined,
    created_at: createdAt,
    description: description || undefined,
    description_hash: descHash || undefined,
    destination: destination.toString('hex'),
    expires_at: expiresAt,
    id: paymentHash.toString('hex'),
    is_expired: expiresAt < new Date().toISOString(),
    mtokens: mtokens || undefined,
    routes: !routes ? undefined : routes,
    tokens: tokens || undefined,
  };
};

