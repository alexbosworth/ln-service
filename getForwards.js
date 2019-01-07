const {promisify} = require('util');

const {getForwards} = require('./');

/** Get forwarded payments

  {
    [limit]: <Page Result Limit Number>
    lnd: <LND GRPC API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via Promise
  {
    forwards: [{
      created_at: <Forward Record Created At ISO 8601 Date String>
      fee: <Fee Satoshis Charged Number>
      fee_mtokens: <Approximated Fee Millitokens Charged String>
      incoming_channel: <Incoming Standard Format Channel Id String>
      mtokens: <Forwarded Millitokens String>
      outgoing_channel: <Outgoing Standard Format Channel Id String>
      row_type: <Row Type String>
    }]
  }
*/
module.exports = promisify(getForwards);

