const {promisify} = require('util');

const {getPublicKey} = require('./');

/** Get a public key in the seed

  {
    family: <Key Family Number>
    index: <Key Index Number>
    lnd: <Authenticated gRPC API LND Object>
  }

  @returns via Promise
  {
    public_key: <Public Key Hex String>
  }
*/
module.exports = promisify(getPublicKey);
