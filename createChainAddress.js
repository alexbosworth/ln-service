const {promisify} = require('util');

const {createChainAddress} = require('./');

/** Create a new receive address.

  {
    format: <Receive Address Type String> // "np2wpkh" || "p2wpkh"
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    address: <Chain Address String>
    type: <Row Type String>
  }
*/
module.exports = promisify(createChainAddress);

