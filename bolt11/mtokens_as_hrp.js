const {multipliers} = require('./conf/multipliers');

/** Get Tokens as the Human Readable Part of a BOLT11 payment request

  {
    [mtokens]: <Millitokens Number> // default: 0
  }

  @returns via cbk
  {
    hrp: <Human Readable Part String>
  }
*/
module.exports = ({mtokens}) => {
  if (!mtokens) {
    return {hrp: ''};
  }

  const amount = BigInt(mtokens);

  const [hrp] = multipliers
    .map(({letter, value}) => ({letter, value: BigInt(value)}))
    .filter(({value}) => !(amount % value))
    .map(({letter, value}) => `${amount / value}${letter}`)
    .sort((a, b) => a.length - b.length);

  return {hrp};
};
