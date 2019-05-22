const {promisify} = require('util');

const {settleHodlInvoice} = require('./');

/** Settle hodl invoice

  {
    lnd: <Authenticated LND gRPC API Object>
    secret: <Payment Preimage Hex String>
  }
*/
module.exports = promisify(settleHodlInvoice);
