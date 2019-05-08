const {promisify} = require('util');

const {getForwards} = require('./');

/** Get forwarded payments, from oldest to newest

  When using an "after" date a "before" date is required.

  {
    [after]: <Get Only Payments Forwarded At Or After ISO 8601 Date String>
    [before]: <Get Only Payments Forwarded Before ISO 8601 Date String>
    [limit]: <Page Result Limit Number>
    lnd: <LND GRPC API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via Promise
  {
    forwards: [{
      created_at: <Forward Record Created At ISO 8601 Date String>
      fee: <Fee Tokens Charged Number>
      fee_mtokens: <Approximated Fee Millitokens Charged String>
      incoming_channel: <Incoming Standard Format Channel Id String>
      outgoing_channel: <Outgoing Standard Format Channel Id String>
      row_type: <Row Type String>
      tokens: <Forwarded Tokens String>
    }]
  }
*/
module.exports = promisify(getForwards);
