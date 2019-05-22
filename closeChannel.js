const {promisify} = require('util');

const {closeChannel} = require('./');

/** Close a channel.

  Either an id or a transaction id / transaction output index is required

  {
    [id]: <Standard Format Channel Id String>
    [is_force_close]: <Is Force Close Bool>
    lnd: <Authenticated LND gRPC API Object>
    [public_key]: <Peer Public Key String>
    [socket]: <Peer Socket String>
    [target_confirmations]: <Confirmation Target Number>
    [tokens_per_vbyte]: <Tokens Per Virtual Byte Number>
    [transaction_id]: <Transaction Id Hex String>
    [transaction_vout]: <Transaction Output Index Number>
  }

  @returns via Promise
  {
    transaction_id: <Closing Transaction Id Hex String>
    transaction_vout: <Closing Transaction Vout Number>
    type: <Row Type String>
  }
*/
module.exports = promisify(closeChannel);

