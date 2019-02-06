const {promisify} = require('util');

const {subscribeToGraph} = require('./');

/** Subscribe to graph updates
  {
    lnd: <LND GRPC API Object>
  }
  @returns via Promise

  <EventEmitter Object>
  @on(data) // channel_update
  {
    base_fee_mtokens: <Channel Base Fee Millitokens String>
    capacity: <Channel Capacity Tokens Number>
    cltv_delta: <Channel CLTV Delta Number>
    fee_rate: <Channel Feel Rate In Millitokens Per Million Number>
    id: <Standard Format Channel Id String>
    is_disabled: <Channel Is Disabled Bool>
    min_htlc_mtokens: <Channel Minimum HTLC Millitokens String>
    public_keys: [<Announcing Public Key>, <Target Public Key String>]
    transaction_id: <Channel Transaction Id String>
    transaction_vout: <Channel Transaction Output Index Number>
    type: <Row Type String>
    updated_at: <Update Received At ISO 8601 Date String>
  }
  @on(data) // closed_channel
  {
    capacity: <Channel Capacity Tokens Number>
    id: <Standard Format Channel Id String>
    close_height: <Channel Close Confirmed Block Height Number>
    transaction_id: <Channel Transaction Id String>
    transaction_vout: <Channel Transaction Output Index Number>
    type: <Row Type String>
    updated_at: <Update Received At ISO 8601 Date String>
  }
  @on(data) // node_update
  {
    alias: <Node Alias String>
    color: <Node Color String>
    public_key: <Node Public Key String>
    [sockets]: [<Network Host And Port String>]
    type: <Row Type String>
    updated_at: <Update Received At ISO 8601 Date String>
  }
*/
module.exports = promisify(subscribeToGraph);

