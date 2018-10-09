const {promisify} = require('util');

const {getInvoices} = require('./');

/** Get all created invoices.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    invoices: [{
      chain_address: <Fallback Chain Address String>
      [confirmed_at]: <Settled at ISO 8601 Date String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      description_hash: <Description Hash Hex String>
      expires_at: <ISO 8601 Date String>
      id: <Payment Hash String>
      is_confirmed: <Invoice is Confirmed Bool>
      is_outgoing: <Invoice is Outgoing Bool>
      is_private: <Invoice is Private Bool>
      received: <Received Tokens Number>
      received_mtokens: <Received Millitokens String>
      request: <Bolt 11 Invoice String>
      routes: [{
        base_fee_mtokens: <Base Routing Fee In Millitokens Number>
        channel_id: <Channel Id String>
        cltv_delta: <CLTV Blocks Delta Number>
        fee_rate: <Fee Rate In Millitokens Per Million Number>
        public_key: <Public Key Hex String>
      }]
      secret: <Secret Preimage Hex String>
      tokens: <Tokens Number>
      type: <Type String>
    }]
    [next]: <Paging Token String>
  }
*/
module.exports = promisify(getInvoices);

