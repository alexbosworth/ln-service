const {promisify} = require('util');

const {getPeers} = require('./');

/** Get connected peers.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    peers: [{
      bytes_received: <Bytes Received Number>
      bytes_sent: <Bytes Sent Number>
      is_inbound: <Is Inbound Peer Bool>
      ping_time: <Milliseconds Number>
      public_key: <Public Key String>
      socket: <Network Address And Port String>
      tokens_received: <Amount Received Tokens Number>
      tokens_sent: <Amount Sent Tokens Number>
      type: <Row Type String>
    }]
  }
*/
module.exports = promisify(getPeers);

