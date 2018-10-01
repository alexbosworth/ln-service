const {promisify} = require('util');

const {addPeer} = require('./');

/** Add a peer if possible (not self, or already connected)

  {
    lnd: <LND GRPC API Object>
    public_key: <Public Key Hex String>
    socket: <Host Network Address And Optional Port String> // ip:port
  }
*/
module.exports = promisify(addPeer);

