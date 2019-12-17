const decodeFeatureFlags = require('./decode_feature_flags');

const bitsPerWord = 5;

/** Feature flags from BOLT 11 tag words

  {
    words: [<BOLT11 Tag Word Number>]
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
module.exports = ({words}) => {
  return decodeFeatureFlags({bits: bitsPerWord, elements: words});
};
