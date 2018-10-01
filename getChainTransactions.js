const {promisify} = require('util');

const {getChainTransactions} = require('./');

/** Get chain transactions.

  {
    lnd: <Object>
  }

  @returns via Promise
  {
    transactions: [{
      [block_id]: <Block Hash String>
      confirmation_count: <Confirmation Count Number>
      created_at: <Created ISO 8601 Date String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Transaction Outbound Bool>
      fee: <Fees Paid Tokens Number>
      id: <Transaction Id String>
      tokens: <Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = promisify(getChainTransactions);

