const {promisify} = require('util');

const {addPeer} = require('./');

/** Add a peer if possible (not self, or already connected)

  {
    [is_temporary]: <Add Peer as Temporary Peer Bool>
    lnd: <Authenticated LND gRPC API Object>
    public_key: <Public Key Hex String>
    socket: <Host Network Address And Optional Port String> // ip:port
  }
*/
module.exports = promisify(addPeer);
