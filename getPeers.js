const {promisify} = require('util');

const {getPeers} = require('./lightning');

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
      network_address: <Network Address String>
      ping_time: <Milliseconds Number>
      public_key: <Public Key String>
      tokens_received: <Amount Received Satoshis Number>
      tokens_sent: <Amount Sent Satoshis Number>
      type: <Type String>
    }]
  }
*/
module.exports = promisify(getPeers);

