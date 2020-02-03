const uniq = arr => Array.from(new Set(arr));

const {isArray} = Array;

/** Ignore as ignored nodes

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
    [ignored]: [<Node Public Key Buffer Object>]
  }
*/
module.exports = ({ignore}) => {
  if (!ignore) {
    return {};
  }

  if (!isArray(ignore)) {
    throw new Error('ExpectedArrayOfIgnoresForIgnoredNodes');
  }

  const ignoreNodes = ignore
    .filter(n => !n.channel)
    .filter(n => !n.to_public_key)
    .filter(n => !!n.from_public_key);

  const nodes = []
    .concat(ignoreNodes.map(n => n.from_public_key))
    .concat(ignoreNodes.map(n => n.to_public_key))
    .filter(n => !!n);

  return {ignored: uniq(nodes).map(n => Buffer.from(n, 'hex'))};
};
