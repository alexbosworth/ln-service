/** Remove a peer if possible (no active or pending channels)

  {
    lnd: <LND GRPC API Object>
    public_key: <Public Key Hex String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd || !args.lnd.disconnectPeer) {
    return cbk([400, 'ExpectedLndForPeerDisconnection']);
  }

  if (!args.public_key) {
    return cbk([400, 'ExpectedPublicKeyOfPeerToRemove']);
  }

  return args.lnd.disconnectPeer({pub_key: args.public_key}, err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorRemovingPeer', err]);
    }

    return cbk();
  });
};

