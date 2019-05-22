const asyncRetry = require('async/retry');

const getPeers = require('./get_peers');

const connectedErrMessage = /already.connected.to/;
const interval = retryCount => 10 * Math.pow(2, retryCount);
const publicKeyHexStringLength = 33 * 2;
const notSyncedError = 'chain backend is still syncing, server not active yet';
const selfKeyErrMessage = /connection.to.self/;
const times = 10;

/** Add a peer if possible (not self, or already connected)

  {
    [is_temporary]: <Add Peer as Temporary Peer Bool>
    lnd: <Authenticated LND gRPC API Object>
    public_key: <Public Key Hex String>
    socket: <Host Network Address And Optional Port String> // ip:port
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd || !args.lnd.default || !args.lnd.default.connectPeer) {
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

  return asyncRetry({interval, times}, cbk => {
    return args.lnd.default.connectPeer({
      addr: {host: args.socket, pubkey: args.public_key},
      perm: !args.is_temporary,
    },
    err => {
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
        return cbk([503, 'UnexpectedErrorAddingPeer', {err}]);
      }

      return getPeers({lnd: args.lnd}, (err, res) => {
        if (!!err) {
          return cbk(err);
        }

        const peer = res.peers.find(n => n.public_key === args.public_key);

        if (!peer) {
          return cbk([503, 'FailedToSuccessfullyConnectToRemotePeer']);
        }

        return cbk();
      });
    });
  },
  cbk);
};
