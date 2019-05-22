const {promisify} = require('util');

const {getBackup} = require('./');

/** Get the static channel backup for a channel

  {
    lnd: <Authenticated LND gRPC API Object>
    transaction_id: <Funding Transaction Id Hex String>
    transaction_vout: <Funding Transaction Output Index Number>
  }

  @returns via Promise
  {
    backup: <Channel Backup Hex String>
  }
*/
module.exports = promisify(getBackup);
