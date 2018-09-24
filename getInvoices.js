const {promisify} = require('util');

const {getInvoices} = require('./');

/** Get all created invoices.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    invoices: [{
      chain_address: <Fallback Chain Address String>
      [confirmed_at]: <Settled at ISO 8601 Date String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      description_hash: <Description Hash Hex String>
      expires_at: <ISO 8601 Date String>
      id: <Payment Hash String>
      is_confirmed: <Invoice is Confirmed Bool>
      is_outgoing: <Invoice is Outgoing Bool>
      request: <BOLT 11 Payment Request String>
      tokens: <Tokens Number>
      type: <Row Type String>
    }]
  }
*/
module.exports = promisify(getInvoices);

