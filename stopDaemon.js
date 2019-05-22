const {promisify} = require('util');

const {stopDaemon} = require('./');

/** Stop the Lightning daemon

  {
    lnd: <Authenticated LND gRPC API Object>
  }
*/
module.exports = promisify(stopDaemon);
