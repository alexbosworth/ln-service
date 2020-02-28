const {Transaction} = require('bitcoinjs-lib');

const isHex = n => !(n.length % 2) && /^[0-9A-F]*$/i.test(n);

/** Determine if a hex string is a regular Transaction

  {
    [transaction]: <Transaction Hex String>
  }

  @returns
  <Looks Like Regular Transaction Bool>
*/
module.exports = ({transaction}) => {
  if (!transaction || !isHex(transaction)) {
    return false;
  }

  try {
    Transaction.fromHex(transaction);
  } catch (err) {
    return false;
  }

  return true;
};
