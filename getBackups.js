const {promisify} = require('util');

const {getBackups} = require('./');

/** Get all channel backups

  {
    lnd: <GRPC API Object>
  }

  @returns via Promise
  {
    backup: <All Channels Backup Hex String>
    channels: {
      backup: <Individualized Channel Backup Hex String>
      transaction_id: <Channel Funding Transaction Id Hex String>
      transaction_vout: <Channel Funding Transaction Output Index Number>
    }
  }
*/
module.exports = promisify(getBackups);
