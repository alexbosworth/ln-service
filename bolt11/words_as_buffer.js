const flatten = arr => [].concat(...arr);
const inBits = 5;
const outBits = 8;
const trimByteLength = 1;

/** Decode bech32 encoded words to bytes

  {
    [trim]: <Trim Buffer Result Bool>
    words: [<Bech 32 Word Number>]
  }

  @throws
  <ExpectedWordsArray Error>

  @returns
  <Decoded Buffer Object>
*/
module.exports = ({trim, words}) => {
  let bits = 0;
  let maxV = (1 << outBits) - 1;
  const result = [];
  let value = 0;

  words.forEach((word, i) => {
    value = (value << inBits) | word;
    bits += inBits;

    while (bits >= outBits) {
      bits -= outBits;

      result.push((value >> bits) & maxV);
    }
  });

  if (!!bits) {
    result.push((value << (outBits - bits)) & maxV);
  }

  if (!!trim && !!(words.length * inBits % outBits)) {
    return Buffer.from(result).slice([].length, -trimByteLength);
  } else {
    return Buffer.from(result);
  }
};
