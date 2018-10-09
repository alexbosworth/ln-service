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
    id: <Invoice Id String>
    is_confirmed: <Is Finalized Bool>
    is_outgoing: <Is Outgoing Bool>
    is_private: <Is a Private Invoice Bool>
    received: <Received Tokens Number>
    received_mtokens: <Received Millitokens String>
    request: <BOLT 11 Encoded Payment Request String>
    secret: <Hex Encoded Payment Secret Preimage String>
    [tokens]: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(getInvoice);

