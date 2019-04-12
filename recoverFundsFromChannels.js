const {promisify} = require('util');

const {recoverFundsFromChannels} = require('./');

/** Verify and restore channels from a multi-channel backup

  {
    backup: <Backup Hex String>
    lnd: <LND GRPC API Object>
  }
*/
module.exports = promisify(recoverFundsFromChannels);
