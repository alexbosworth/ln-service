const isHex = require('is-hex');

/** Remove a peer if possible

  {
    lnd: <Authenticated LND gRPC API Object>
    public_key: <Public Key Hex String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd || !args.lnd.default || !args.lnd.default.disconnectPeer) {
    return cbk([400, 'ExpectedLndForPeerDisconnection']);
  }

  if (!args.public_key) {
    return cbk([400, 'ExpectedPublicKeyOfPeerToRemove']);
  }

  return args.lnd.default.disconnectPeer({pub_key: args.public_key}, err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorRemovingPeer', {err}]);
    }

    return cbk();
  });
};
