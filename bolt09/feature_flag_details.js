const featureFlags = require('./feature_flags');

/** Feature flag details for feature flag bit

  {
    bit: <Feature Flag Bit Number>
  }

  @throws
  <Error>

  @returns
  {
    [type]: <Feature Flag Type String>
  }
*/
module.exports = ({bit}) => {
  const flag = featureFlags[`${bit}`];

  if (!flag) {
    return {};
  }

  return {type: flag.type};
};
