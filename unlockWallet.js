const {promisify} = require('util');

const {unlockWallet} = require('./');

/** Unlock the wallet

  {
    lnd: <LND GRPC API Object>
    password: <Password String>
  }
*/
module.exports = promisify(unlockWallet);

