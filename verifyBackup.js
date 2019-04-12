const {promisify} = require('util');

const {verifyBackup} = require('./');

/** Verify a channel backup

  {
    backup: <Backup Hex String>
    lnd: <LND GRPC API Object>
    transaction_id: <Transaction Id String>
    transaction_vout: <Transaction Output Index Number>
  }

  @returns via Promise
  {
    is_valid: <Backup is Valid Bool>
  }
*/
module.exports = promisify(verifyBackup);
