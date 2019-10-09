const isHex = require('is-hex');

const hashHexLength = 64;

/** Determine if a string looks like a regular 256 bit hex encoded hash

  {
    [hash]: <Hash String>
  }

  @returns
  {
    is_hash: <Looks Like Regular Hash Bool>
  }
*/
module.exports = ({hash}) => {
  return {is_hash: !!hash && isHex(hash) && hash.length === hashHexLength};
};
