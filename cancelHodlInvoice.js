const {promisify} = require('util');

const {cancelHodlInvoice} = require('./');

/** Cancel back an invoice

  {
    id: <Payment Hash Hex String>
    lnd: <Authenticated RPC LND gRPC API Object>
  }
*/
module.exports = promisify(cancelHodlInvoice);
