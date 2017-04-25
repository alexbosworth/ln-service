const rowTypes = require('./../config/row_types');

/** Get connected peers.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
    bytes_received: <Bytes Received Number>
    bytes_sent: <Bytes Sent Number>
    id: <Peer Id Number>
    network_address: <Network Address String>
    ping_time: <Milliseconds Number>
    public_key: <Public Key String>
    tokens_received: <Amount Received Satoshis Number>
    tokens_sent: <Amount Sent Satoshis Number>
    type: <Type String>
  }]
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.listPeers({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get peers error', err]); }

    if (!res || !Array.isArray(res.peers)) {
      return cbk([500, 'Expected peers array', res]);
    }

    // FIXME: - check for valid peer data

    const peers = res.peers.map((peer) => {
      return {
        bytes_received: parseInt(peer.bytes_recv),
        bytes_sent: parseInt(peer.bytes_sent),
        id: peer.peer_id,
        network_address: peer.address,
        ping_time: Math.round(parseInt(peer.ping_time) / 1000),
        public_key: peer.pub_key,
        tokens_received: parseInt(peer.sat_recv),
        tokens_sent: parseInt(peer.sat_sent),
        type: rowTypes.peer,
      };
    });

    return cbk(null, peers);
  });
};

