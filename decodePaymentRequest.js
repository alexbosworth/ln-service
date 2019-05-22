const {promisify} = require('util');

const {decodePaymentRequest} = require('./');

/** Get decoded payment request

  {
    lnd: <Authenticated LND gRPC API Object>
    request: <BOLT 11 Payment Request String>
  }

  @returns via Promise
  {
    chain_address: <Fallback Chain Address String>
    [cltv_delta]: <Final CLTV Delta Number>
    description: <Payment Description String>
    destination_hash: <Payment Longer Description Hash String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Hash String>
    routes: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    tokens: <Requested Tokens Number>
    type: <Row Type String>
  }
*/
module.exports = promisify(decodePaymentRequest);
