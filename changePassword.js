const {promisify} = require('util');

const {changePassword} = require('./');

/** Change password

  {
    current_password: <Current Password String>
    lnd: <WalletUnlocker LND GRPC API Object>
    new_password: <New Password String>
  }
*/
module.exports = promisify(changePassword);
