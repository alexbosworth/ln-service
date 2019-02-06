const {promisify} = require('util');

const {subscribeToTransactions} = require('./');

/** Subscribe to transactions
  {
    lnd: <LND GRPC API Object>
  }
  @returns via Promise
  <EventEmitter Object>
  @on(data)
  {
    [block_id]: <Block Hash String>
    confirmation_count: <Confirmation Count Number>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Transaction Outbound Bool>
    fee: <Fees Paid Tokens Number>
    id: <Transaction Id String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/

module.exports = promisify(subscribeToTransactions);

