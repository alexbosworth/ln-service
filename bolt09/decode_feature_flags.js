const featureFlagDetails = require('./feature_flag_details');

const isEven = number => !(number % 2);
const times = n => Array.from({length: n}).map((_, i) => i);

/** Feature flags

  {
    [hex]: <Data Length Prefixed Hex Encoded String>
    [words]: [<BOLT 11 Bech32 Word Number>]
  }

  @throws
  <Error>

  @returns
  {
    features: [{
      bit: <Feature Bit Number>
      is_required: <Feature Bit is Required Bool>
      type: <Feature Bit Type String>
    }]
  }
*/
module.exports = ({bits, elements}) => {
  const features = new Set();

  elements.forEach((currentByte, index) => {
    return times(bits)
      .filter(i => currentByte & 1 << i)
      .forEach(i => features.add((elements.length - 1 - index) * bits + i))
  });

  return {
    features: Array.from(features).sort().map(bit => ({
      bit,
      is_required: isEven(bit),
      type: featureFlagDetails({bit}).type,
    })),
  };
};
