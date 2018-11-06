const {promisify} = require('util');

const {getNetworkGraph} = require('./');

/** Get network graph

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    channels: [{
      capacity: <Channel Capacity Tokens Number>
      id: <Channel Id String>
      policies: [{
        [base_fee_mtokens]: <Bae Fee Millitokens String>
        [cltv_delta]: <CLTV Height Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        [is_disabled]: <Edge is Disabled Bool>
        [minimum_htlc_mtokens]: <Minimum HTLC Millitokens String>
        public_key: <Public Key String>
      }]
      transaction_id: <Funding Transaction Id String>
      transaction_vout: <Funding Transaction Output Index Number>
      updated_at: <Last Update Epoch ISO 8601 Date String>
    }]
    nodes: [{
      alias: <Name String>
      color: <Hex Encoded Color String>
      public_key: <Node Public Key String>
      sockets: [<Network Address and Port String>]
      updated_at: <Last Updated ISO 8601 Date String>
    }]
  }
*/
module.exports = promisify(getNetworkGraph);

