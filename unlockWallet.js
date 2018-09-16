const {promisify} = require('util');

const {unlockWallet} = require('./lightning');

/** Unlock the wallet

  {
    lnd: <LND GRPC API Object>
    password: <Password String>
  }
*/
module.exports = promisify(unlockWallet);

