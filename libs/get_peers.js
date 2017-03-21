/** Get balance

  {
    lnd_grpc_api: <Object>
  }
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
        amount_received: peer.sat_recv,
        amount_sent: peer.sat_sent,
        id: peer.peer_id,
        network_address: peer.address,
        public_key: peer.pub_key,
      };
    });

    return cbk(null, peers);
  });
};

