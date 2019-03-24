const decBase = 10;
const {floor} = Math;
const mtokPerToken = 1e3;

/** Get millitokens as tokens

  {
    mtokens: <Millitokens BigInt>
  }

  @returns
  {
    tokens: <Tokens Number>
  }
*/
module.exports = ({mtokens}) => {
  const tokens = floor(parseInt(mtokens.toString(), decBase) / mtokPerToken);

  return {tokens};
};
