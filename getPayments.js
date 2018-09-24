const {promisify} = require('util');

const {getPayments} = require('./');

/** Get payments made through channels.

  {
    lnd: <Object>
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
      tokens: <Sent Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = promisify(getPayments);

