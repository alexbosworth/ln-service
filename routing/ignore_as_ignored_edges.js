const {chanNumber} = require('bolt07');

/** Ignore as ignored edges

  {
    [ignore]: [{
      [channel]: <Channel Id String>
      from_public_key: <From Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
  }

  @throws
  <Error>

  @returns
  {
    [ignored]: [{
      channel_id: <Numeric Channel Id>
      direction_reverse: <Direction Reversed Bool>
    }]
  }
*/
module.exports = ({ignore}) => {
  if (!ignore) {
    return {};
  }

  if (!Array.isArray(ignore)) {
    throw new Error('ExpectedArrayOfEdgesToIgnore');
  }

  const channels = ignore.filter(n => !!n.channel && !!n.to_public_key);

  const ignored = channels.map(n => ({
    channel_id: chanNumber({channel: n.channel}).number,
    direction_reverse: n.to_public_key < n.from_public_key,
  }));

  return {ignored};
};
