const {promisify} = require('util');

const {verifyBackup} = require('./');

/** Verify a channel backup

  {
    backup: <Backup Hex String>
    lnd: <Authenticated LND gRPC API Object>
    transaction_id: <Transaction Id Hex String>
    transaction_vout: <Transaction Output Index Number>
  }

  @returns via Promise
  {
    [err]: <LND Error Object>
    is_valid: <Backup is Valid Bool>
  }
*/
module.exports = promisify(verifyBackup);
