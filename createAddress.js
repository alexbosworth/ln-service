const {promisify} = require('util');

const {createAddress} = require('./lightning');

/** Create a new receive address.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    address: <Chain Address String>
    type: <Type String>
  }
*/
module.exports = promisify(createAddress);

