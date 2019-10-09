const isHex = require('is-hex');
const {Transaction} = require('bitcoinjs-lib');

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
