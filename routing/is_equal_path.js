const {keys} = Object;

/** Determine if paths are equal

  {
    paths: [
      [{
        channel: <Standard Format Channel Id String>
        public_key: <Public Key Hex String>
      }]
    ]
  }

  @returns
  <Paths Are Equal Bool>
*/
module.exports = ({paths}) => {
  const [path1, path2] = paths;

  // Paths that aren't the same length aren't the same
  if (path1.length !== path2.length) {
    return false;
  }

  return !!keys(path1).find(i => {
    const a = path1[i];
    const b = path2[i];

    return a.channel === b.channel && a.public_key === b.public_key;
  });
};
