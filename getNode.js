const {promisify} = require('util');

const {getNode} = require('./');

/** Get information about a node

  {
    lnd: <Authenticated LND gRPC API Object>
    public_key: <Node Public Key Hex String>
  }

  @returns via Promise
  {
    alias: <Node Alias String>
    capacity: <Node Total Capacity Tokens Number>
    channel_count: <Known Node Channels Number>
    [channels]: [{
      capacity: <Maximum Tokens Number>
      id: <Standard Format Channel Id String>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>
        [fee_rate]: <Fees Charged Per Million Tokens Number>
        [is_disabled]: <Channel Is Disabled Bool>
        [max_htlc_mtokens]: <Maximum HTLC Millitokens Value String>
        [min_htlc_mtokens]: <Minimum HTLC Millitokens Value String>
        public_key: <Node Public Key String>
      }]
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
      [updated_at]: <Channel Last Updated At ISO 8601 Date String>
    }]
    color: <RGB Hex Color String>
    sockets: [{
      socket: <Host and Port String>
      type: <Address Network Type String>
    }]
    [updated_at]: <Last Known Update ISO 8601 Date String>
  }
*/
module.exports = promisify(getNode);
