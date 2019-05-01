const {toWords} = require('bech32');

const encoding = 'utf8';

/** Description string as words

  {
    [description]: <Payment Request Description String>
  }

  @returns
  {
    [words]: [<Bech32 Word Number>]
  }
*/
module.exports = ({description}) => {
  if (!description) {
    return {};
  }

  return {words: toWords(Buffer.from(description, encoding))};
};
