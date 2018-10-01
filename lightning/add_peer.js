const connectedErrMessage = /already.connected.to/;
const publicKeyHexStringLength = 33 * 2;
const notSyncedError = 'chain backend is still syncing, server not active yet';
const selfKeyErrMessage = /connection.to.self/;

/** Add a peer if possible (not self, or already connected)

  {
    lnd: <LND GRPC API Object>
    public_key: <Public Key Hex String>
    socket: <Host Network Address And Optional Port String> // ip:port
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd) {
    return cbk([400, 'ExpectedLndToAddPeer']);
  }

  if (!args.public_key) {
    return cbk([400, 'ExpectedPublicKeyOfPeerToAdd']);
  }

  if (args.public_key.length !== publicKeyHexStringLength) {
    return cbk([400, 'UnexpectedLengthOfPublicKeyToAdd']);
  }

  if (!args.socket) {
    return cbk([400, 'ExpectedHostAndPortOfPeerToAdd']);
  }

  const addr = {host: args.socket, pubkey: args.public_key};

  return args.lnd.connectPeer({addr, perm: true}, (err, response) => {
    // Exit early when the peer is already added
    if (!!err && !!err.message && connectedErrMessage.test(err.message)) {
      return cbk();
    }

    // Exit early when the peer is the self-peer
    if (!!err && !!err.message && selfKeyErrMessage.test(err.message)) {
      return cbk();
    }

    if (!!err && err.details === notSyncedError) {
      return cbk([503, 'StillSyncing']);
    }

    if (!!err) {
      return cbk([503, 'UnexpectedErrorAddingPeer', err]);
    }

    return cbk();
  });
};


