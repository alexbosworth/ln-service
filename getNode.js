const {promisify} = require('util');

const {getNode} = require('./');

/** Get information about a node

  {
    lnd: <LND GRPC API Object>
    public_key: <Node Public Key Hex String>
  }

  @returns via Promise
  {
    addresses: [{
      address: <Address String>
      type: <Address Network Type String>
    }]
    alias: <Node Alias String>
    capacity: <Node Total Capacity Tokens Number>
    channel_count: <Known Node Channels Number>
    color: <RGB Hex Color String>
    [updated_at]: <Last Known Update ISO 8601 Date String>
  }
*/
module.exports = promisify(getNode);

