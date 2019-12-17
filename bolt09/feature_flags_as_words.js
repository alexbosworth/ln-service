const bitsPerByte = 5;
const {floor} = Math;
const {max} = Math;

/** Encode feature flags into a serialized data buffer

  {
    features: [<Feature Bit Number>]
  }

  @throws
  <Error>

  @returns
  {
    words: [<Bech32 Word Number>]
  }
*/
module.exports = ({features}) => {
  const words = [];

  // Exit early with no words when there are no features
  if (!features.length) {
    return {words};
  }

  const data = Buffer.alloc(floor(max(...features) / bitsPerByte) + 1);

  features
    .map(n => ({offset: floor(n / bitsPerByte), remainder: n % bitsPerByte}))
    .forEach(n => data[data.length - 1 - n.offset] |= 1 << n.remainder);

  for (const [_, byte] of data.entries()) {
    words.push(byte);
  }

  return {words};
};
