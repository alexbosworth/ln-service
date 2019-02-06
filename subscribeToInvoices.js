const {promisify} = require('util');

const {subscribeToInvoices} = require('./');

/** Subscribe to invoices

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  <EventEmitter Object>

  @on(data)
  {
    [confirmed_at]: <Confirmed At ISO 8601 Date String>
    created_at: <Created At ISO 8601 Date String>
    description: <Description String>
    expires_at: <Expires At ISO 8601 Date String>
    id: <Invoice Id Hex String>
    is_confirmed: <Invoice is Confirmed Bool>
    is_outgoing: <Invoice is Outgoing Bool>
    secret: <Payment Secret Hex String>
    tokens: <Tokens Number>
    type: <Row Type String>
  }
*/
module.exports = promisify(subscribeToInvoices);

