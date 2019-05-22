const {promisify} = require('util');

const {sendToChainAddresses} = require('./');

/** Send tokens to multiple destinations in a blockchain transaction.

  {
    [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function>
    send_to: [{
      address: <Address String>
      tokens: <Tokens Number>
    }]
    [target_confirmations]: <Confirmations To Wait Number>
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
module.exports = promisify(sendToChainAddresses);
