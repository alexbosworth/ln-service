const bitsPerByte = 8;
const {floor} = Math;
const {max} = Math;
const uint16ByteLength = 2;

/** Encode feature flags into hex serialized bytes

  {
    features: [<Feature Bit Number>]
  }

  @throws
  <Error>

  @returns
  {
    encoded: <Serialized Feature Bits Hex Encoded String>
  }
*/
module.exports = ({features}) => {
  const lengthBytes = Buffer.alloc(uint16ByteLength);

  // Exit early with zero data length encoded when there are no features
  if (!features.length) {
    return {encoded: lengthBytes.toString('hex')};
  }

  const data = Buffer.alloc(floor(max(...features) / bitsPerByte) + 1);

  lengthBytes.writeUInt16BE(data.length);

  features
    .map(n => ({offset: floor(n / bitsPerByte), remainder: n % bitsPerByte}))
    .forEach(n => data[data.length - 1 - n.offset] |= 1 << n.remainder);

  return {encoded: Buffer.concat([lengthBytes, data]).toString('hex')};
};
