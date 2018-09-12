const {promisify} = require('util');

const {sendToChainAddress} = require('./lightning');

/** Send tokens in a blockchain transaction.

  {
    address: <Destination Address String>
    lnd: <Object>
    tokens: <Satoshis Number>
    wss: <Web Socket Server Object>
  }

  @returns via Promise
  {
    confirmation_count: <Number>
    id: <Transaction Id String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outgoing Bool>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(sendToChainAddress);

