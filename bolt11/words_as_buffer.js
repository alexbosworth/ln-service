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
  if (!Array.isArray(words)) {
    throw new Error('ExpectedWordsArray');
  }

  let bits = 0;
  let maxV = (1 << outBits) - 1;
  const result = [];
  let value = 0;

  for (let i = 0; i < words.length; ++i) {
    value = (value << inBits) | words[i];
    bits += inBits;

    while (bits >= outBits) {
      bits -= outBits;

      result.push((value >> bits) & maxV);
    }
  }

  if (bits > 0) {
    result.push((value << (outBits - bits)) & maxV);
  }

  if (!!trim && words.length * inBits % outBits !== 0) {
    return Buffer.from(result).slice(0, -trimByteLength);
  } else {
    return Buffer.from(result);
  }
};

