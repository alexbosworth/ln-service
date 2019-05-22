const {promisify} = require('util');

const {getChainTransactions} = require('./');

/** Get chain transactions.

  {
    lnd: <Authenticated LND gRPC Object>
  }

  @returns via Promise
  {
    transactions: [{
      [block_id]: <Block Hash String>
      [confirmation_count]: <Confirmation Count Number>
      [confirmation_height]: <Confirmation Block Height Number>
      created_at: <Created ISO 8601 Date String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Transaction Outbound Bool>
      [fee]: <Fees Paid Tokens Number>
      id: <Transaction Id String>
      output_addresses: [<Address String>]
      tokens: <Tokens Including Fee Number>
      type: <Type String>
    }]
  }
*/
module.exports = promisify(getChainTransactions);
