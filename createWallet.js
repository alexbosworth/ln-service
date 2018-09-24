const {promisify} = require('util');

const {createWallet} = require('./');

/** Create a wallet

  {
    lnd: <LND GRPC API Object>
    [passphrase]: <Seed Passphrase String>
    password: <Wallet Password String>
    seed: <Seed Mnemonic String>
  }
*/
module.exports = promisify(createWallet);

