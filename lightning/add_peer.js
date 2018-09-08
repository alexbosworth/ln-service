/** Add a peer if possible (not self, or already connected)

  {
    host: <Host Network Address String>
    lnd: <LND GRPC API Object>
    public_key: <Public Key Hex String>
  }
*/
module.exports = async (args) => {
  let result = await new Promise((resolve, reject) => {
    if (!args.host) {
      return reject([400, 'ExpectedHost']);
    }

    if (!args.lnd) {
      return reject([500, 'ExpectedLnd']);
    }

    if (!args.public_key) {
      return reject([400, 'ExpectedPublicKey']);
    }
    args.lnd.connectPeer({
      addr: {host: args.host, pubkey: args.public_key},
      perm: true,
    }, (err, response) => {
      // Exit early when the peer is already added
      if (!!err && !!err.message && /already.connected.to/.test(err.message)) {
        return resolve();
      }

      // Exit early when the peer is the self-peer
      if (!!err && !!err.message && /connection.to.self/.test(err.message)) {
        return resolve();
      }

      if (!!err) {
        return reject([503, 'AddPeerError', err]);
      }

      return resolve(response);
    });
  });

  return result;
};
