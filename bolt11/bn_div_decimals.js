const BN = require('bn.js');

module.exports = (BNMod, BNDivisor, maxDecimals) => {
  let dec = '';
  const BNTen = new BN(10, 10);
  for (let i = 0; i < maxDecimals; i++) {
    const BNDiv = BNMod.mul(BNTen).divmod(BNDivisor);
    dec += BNDiv.div.toString();
    BNMod = BNDiv.mod;
  }
  return dec;
};
