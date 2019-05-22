const {promisify} = require('util');

const {signMessage} = require('./');

/** Sign a message

  {
    lnd: <Authenticated LND gRPC API Object>
    message: <Message String>
  }

  @returns via Promise
  {
    signature: <Signature String>
  }
*/
module.exports = promisify(signMessage);
