const {promisify} = require('util');

const {decodeInvoice} = require('./lightning');

/** Get decoded invoice

  {
    invoice: <Serialized BOLT 11 Invoice String>
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    chain_address: <Fallback Chain Address String>
    description: <Payment Description String>
    destination_hash: <Payment Longer Description Hash String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Request Hash String>
    tokens: <Requested Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(decodeInvoice);

