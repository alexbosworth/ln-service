const {promisify} = require('util');

const {sendToChainAddress} = require('./');

/** Send tokens in a blockchain transaction.

  {
    address: <Destination Chain Address String>
    [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
    [is_send_all]: <Send All Funds Bool>
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function>
    [target_confirmations]: <Confirmations To Wait Number>
    tokens: <Tokens To Send Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via Promise
  {
    confirmation_count: <Total Confirmations Number>
    id: <Transaction Id Hex String>
    is_confirmed: <Transaction Is Confirmed Bool>
    is_outgoing: <Transaction Is Outgoing Bool>
    tokens: <Transaction Tokens Number>
    type: <Row Type String>
  }
*/
module.exports = promisify(sendToChainAddress);
