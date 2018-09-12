const {promisify} = require('util');

const {getInvoice} = require('./lightning');

/** Lookup a channel invoice.

  {
    lnd: <LND GRPC API Object>
    id: <Payment Hash Id Hex String>
  }

  @returns via Promise
  {
    description: <Description String>
    expires_at: <ISO 8601 Date String>
    id: <Invoice Id String>
    invoice: <Bolt 11 Invoice String>
    is_confirmed: <Is Finalized Bool>
    is_outgoing: <Is Outgoing Bool>
    payment_secret: <Hex Encoded Payment Secret Preimage String>
    [tokens]: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(getInvoice);

