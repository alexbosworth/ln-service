const {promisify} = require('util');

const {getInvoice} = require('./');

/** Lookup a channel invoice.

  {
    id: <Payment Hash Id Hex String>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via Promise
  {
    chain_address: <Fallback Chain Address String>
    [confirmed_at]: <Settled at ISO 8601 Date String>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    description_hash: <Description Hash Hex String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Hash String>
    [is_canceled]: <Invoice is Canceled Bool>
    is_confirmed: <Invoice is Confirmed Bool>
    [is_held]: <HTLC is Held Bool>
    is_outgoing: <Invoice is Outgoing Bool>
    is_private: <Invoice is Private Bool>
    received: <Received Tokens Number>
    received_mtokens: <Received Millitokens String>
    request: <Bolt 11 Invoice String>
    secret: <Secret Preimage Hex String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(getInvoice);
