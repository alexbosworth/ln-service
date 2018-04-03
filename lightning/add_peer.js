/** Add a peer if possible (not self, or already connected)

  {
    host: <Host Network Address String>
    lnd: <LND GRPC API Object>
    public_key: <Public Key Hex String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.host) {
    return cbk([400, 'ExpectedHost']);
  }

  if (!args.lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  if (!args.public_key) {
    return cbk([400, 'ExpectedPublicKey']);
  }

  return args.lnd.connectPeer({
    addr: {host: args.host, pubkey: args.public_key},
    perm: true,
  },
  (err, response) => {
    // Exit early when the peer is already added
    if (!!err && !!err.message && /already.connected.to/.test(err.message)) {
      return cbk();
    }

    // Exit early when the peer is the self-peer
    if (!!err && !!err.message && /connection.to.self/.test(err.message)) {
      return cbk();
    }

    if (!!err) {
      return cbk([503, 'AddPeerError', err]);
    }

    return cbk();
  });
};


