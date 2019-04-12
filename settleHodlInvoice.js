const {promisify} = require('util');

const {settleHodlInvoice} = require('./');

/** Settle hodl invoice

  {
    lnd: <Invoices RPC LND GRPC API Object>
    secret: <Payment Preimage Hex String>
  }
*/
module.exports = promisify(settleHodlInvoice);
