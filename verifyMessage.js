const {promisify} = require('util');

const {verifyMessage} = require('./');

/** Verify a message was signed by a known pubkey

  {
    lnd: <LND GRPC API Object>
    message: <Message String>
    signature: <Signature String>
  }

  @returns via Promise
  {
    [signed_by]: <Public Key String>
  }
*/
module.exports = promisify(verifyMessage);
