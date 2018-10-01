const {promisify} = require('util');

const {closeChannel} = require('./');

/** Close a channel.

  Either an id or a transaction id / transaction output index is required

  {
    [id]: <Channel Id String>
    [is_force_close]: <Is Force Close Bool>
    lnd: <LND GRPC API Object>
    [transaction_id]: <Transaction Id Hex String>
    [transaction_vout]: <Transaction Output Index Number>
  }
*/
module.exports = promisify(closeChannel);

