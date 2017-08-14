/** Add a peer.

  {
    host: <Host String>
    lnd_grpc_api: <Object>
    public_key: <Public Key String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.host || !args.lnd_grpc_api || !args.public_key) {
    return cbk([500, 'Expected address, lnd grpc api, public key', args]);
  }

  const addPeer = args.lnd_grpc_api.connectPeer({
    addr: {host: args.host, pubkey: args.public_key},
    perm: true,
  },
  (err, response) => {
    if (!!err) { return cbk([500, 'Add Peer Error', err]); }

    return cbk();
  });
};


