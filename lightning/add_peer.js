/** Add a peer if possible (not self, or already connected)

  {
    host: <Host Network Address String>
    lnd: <LND GRPC API Object>
    public_key: <Public Key Hex String>
  }
*/
module.exports = ({host, lnd, public_key}) => {
  return new Promise((resolve, reject) => {
    if (!host) {
      reject([400, 'ExpectedHost']);
    } else if (!lnd) {
      reject([500, 'ExpectedLnd']);
    } else if (!public_key) {
      reject([400, 'ExpectedPublicKey']);
    } else {
      lnd.connectPeer({
        addr: {host, pubkey: public_key},
        perm: true,
      },
      (err) => {
        if (!!err) {
          if (!!err.message && /already.connected.to/.test(err.message)) {
            // Exit early when the peer is already added
            resolve();
          } else if (!!err.message && /connection.to.self/.test(err.message)) {
            // Exit early when the peer is the self-peer
            resolve();
          } else {
            reject([503, 'AddPeerError', err]);
          }
        } else {
          resolve();
        }    
      });
    }
  });
};
