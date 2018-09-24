const {promisify} = require('util');

const {createSeed} = require('./');

/** Create a wallet seed

  {
    lnd: <LND GRPC API Object>
    [passphrase]: <Seed Passphrase String>
  }

  @returns via Promise
  {
    seed: <Cipher Seed Mnemonic String>
  }
*/
module.exports = promisify(createSeed);

