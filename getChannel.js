const {promisify} = require('util');

const {getChannel} = require('./');

/** Get a channel

  {
    id: <Channel Id String>
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    capacity: <Maximum Tokens Number>
    policies: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      cltv_delta: <Locktime Delta Number>
      fee_rate: <Fees Charged Per Million Tokens Number>
      is_disabled: <Channel Is Disabled Bool>
      minimum_htlc_mtokens: <Minimum HTLC Millitokens Value String>
      public_key: <Node Public Key String>
    }]
    transaction_id: <Transaction Id Hex String>
    transaction_vout: <Transaction Output Index Number>
    update_at: <Channel Last Updated At ISO 8601 Date String>
  }
*/
module.exports = promisify(getChannel);

