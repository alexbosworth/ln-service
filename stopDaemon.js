const {promisify} = require('util');

const {stopDaemon} = require('./');

/** Stop the Lightning daemon

  {
    lnd: <LND GRPC API Object>
  }
*/
module.exports = promisify(stopDaemon);

