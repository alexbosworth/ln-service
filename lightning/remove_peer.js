/** Remove a peer if possible (no active or pending channels)

  {
    lnd: <LND GRPC API Object>
    public_key: <Public Key Hex String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  if (!args.public_key) {
    return cbk([400, 'ExpectedPublicKey']);
  }

  return args.lnd.disconnectPeer({
    pub_key: args.public_key
  },
  (err, response) => {
    if (!!err) {
      return cbk([503, 'ErrorRemovingPeer', err]);
    }

    return cbk();
  });
};

