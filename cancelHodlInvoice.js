const {promisify} = require('util');

const {cancelHodlInvoice} = require('./');

/** Cancel back a hodl invoice

  {
    id: <Payment Hash Hex String>
    lnd: <Invoices RPC LND GRPC API Object>
  }
*/
module.exports = promisify(cancelHodlInvoice);
