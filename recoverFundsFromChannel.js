const {promisify} = require('util');

const {recoverFundsFromChannel} = require('./');

/** Verify and restore a channel from a single channel backup

  {
    backup: <Backup Hex String>
    lnd: <Authenticated LND gRPC API Object>
    transaction_id: <Channel Funding Transaction Id Hex String>
    transaction_vout: <Channel Funding Transaction Output Index Hex String>
  }
*/
module.exports = promisify(recoverFundsFromChannel);
