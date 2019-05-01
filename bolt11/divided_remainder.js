const BN = require('bn.js');

const bigTen = new BN(10, 10);
const start = '';

/** Big number decimal number divided decimal remainder string

  {
    div: <Divisor Big Number>
    max: <Max Divisibility Number>
    mod: <Mod Big Number Object>
  }

  @returns
  <Decimal String>
*/
module.exports = ({mod, div, max}) => {
  return Array.from({length: max}).reduce(accumulator => {
    const bigDiv = mod.mul(bigTen).divmod(div);

    mod = bigDiv.mod;

    return accumulator + bigDiv.div.toString();
  },
  start);
};
