/** Convert words to a big endian int

  {
    words: [<Bech32 Word Number>]
  }

  @returns
  <Big Endian Number>
*/
module.exports = ({words}) => {
  return words.reverse().reduce((sum, n, i) => sum + n * Math.pow(32, i), 0);
};

