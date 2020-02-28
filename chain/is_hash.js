const isHash = n => /^[0-9A-F]{64}$/i.test(n);

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
  return {is_hash: !!hash && isHash(hash)};
};
