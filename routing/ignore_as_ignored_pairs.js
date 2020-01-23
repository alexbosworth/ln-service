const {chanNumber} = require('bolt07');

const {isArray} = Array;

/** Ignore as ignored pairs

  {
    [ignore]: [{
      [channel]: <Standard Format Channel Id String>
      from_public_key: <From Public Key Hex String>
      to_public_key: <To Public Key Hex String>
    }]
  }

  @throws
  <Error>

  @returns
  {
    [ignored]: [{
      from: <From Public Key Buffer Object>
      to: <To Public Key Buffer Object>
    }]
  }
*/
module.exports = ({ignore}) => {
  if (!ignore) {
    return {};
  }

  if (!isArray(ignore)) {
    throw new Error('ExpectedArrayOfPairsToIgnore');
  }

  const pairs = ignore.filter(n => !!n.from_public_key && !!n.to_public_key);

  const ignored = pairs.map(n => ({
    from: Buffer.from(n.from_public_key, 'hex'),
    to: Buffer.from(n.to_public_key, 'hex'),
  }));

  return {ignored};
};
