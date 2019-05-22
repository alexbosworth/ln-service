const {promisify} = require('util');

const {unlockWallet} = require('./');

/** Unlock the wallet

  {
    lnd: <Unauthenticed LND gRPC API Object>
    password: <Password String>
  }
*/
module.exports = promisify(unlockWallet);
