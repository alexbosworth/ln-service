const {promisify} = require('util');

const {sendToChainAddress} = require('./');

/** Send tokens in a blockchain transaction.

  {
    address: <Destination Chain Address String>
    [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
    lnd: <LND GRPC Object>
    [target_confirmations]: <Confirmations To Wait Number>
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

