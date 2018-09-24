const {promisify} = require('util');

const {getInvoice} = require('./');

/** Lookup a channel invoice.

  {
    lnd: <LND GRPC API Object>
    id: <Payment Hash Id Hex String>
  }

  @returns via Promise
  {
    description: <Description String>
    expires_at: <ISO 8601 Date String>
    id: <Invoice Payment Hash Hex String>
    is_confirmed: <Is Finalized Bool>
    is_outgoing: <Is Outgoing Bool>
    request: <Bolt 11 Payment Request String>
    secret: <Hex Encoded Payment Secret Preimage Hex String>
    [tokens]: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(getInvoice);

