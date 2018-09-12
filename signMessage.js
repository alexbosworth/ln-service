const {promisify} = require('util');

const {signMessage} = require('./lightning');

/** Sign a message

  {
    lnd: <LND GRPC API Object>
    message: <Message String>
  }

  @returns via cbk
  {
    signature: <Signature String>
  }
*/
module.exports = promisify(signMessage);

