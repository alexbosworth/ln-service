const {promisify} = require('util');

const {getPayments} = require('./');

/** Get payments made through channels.

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via Promise
  {
    payments: [{
      created_at: <ISO8601 Date String>
      destination: <Compressed Public Key String>
      fee: <Tokens Number>
      hop_count: <Route Hops Number>
      id: <RHash Id String>
      is_confirmed: <Bool>
      is_outgoing: <Is Outgoing Bool>
      mtokens: <Millitokens Paid String>
      tokens: <Sent Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = promisify(getPayments);
