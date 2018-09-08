/** Remove a peer if possible (no active or pending channels)

  {
    lnd: <LND GRPC API Object>
    public_key: <Public Key Hex String>
  }
*/
module.exports = async (args) => {
  return await new Promise((resolve, reject) => {
    if (!args.lnd) {
      return reject([500, 'ExpectedLnd']);
    }

    if (!args.public_key) {
      return reject([400, 'ExpectedPublicKey']);
    }

    args.lnd.disconnectPeer({
      pub_key: args.public_key
    },
    (err, response) => {
      if (!!err) {
        return reject([503, 'ErrorRemovingPeer', err]);
      }

      return resolve();
    });
  });
};
