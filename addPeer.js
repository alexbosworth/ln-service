const {promisify} = require('util');

const {addPeer} = require('./lightning');

/** Add a peer if possible (not self, or already connected)

  {
    host: <Host Network Address String>
    lnd: <LND GRPC API Object>
    public_key: <Public Key Hex String>
  }
*/
module.exports = promisify(addPeer);

