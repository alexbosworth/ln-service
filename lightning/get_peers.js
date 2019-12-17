const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {returnResult} = require('asyncjs-util');

const {featureFlagDetails} = require('./../bolt09');

const decBase = 10;
const {ceil} = Math;
const {isArray} = Array;
const microPerMilli = 1e3;

/** Get connected peers.

  LND 0.8.2 and below do not return `features`

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    peers: [{
      bytes_received: <Bytes Received Number>
      bytes_sent: <Bytes Sent Number>
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_known: <Feature is Known Bool>
        is_required: <Feature Support is Required Bool>
        type: <Feature Type String>
      }]
      is_inbound: <Is Inbound Peer Bool>
      [is_sync_peer]: <Is Syncing Graph Data Bool>
      ping_time: <Milliseconds Number>
      public_key: <Public Key String>
      socket: <Network Address And Port String>
      tokens_received: <Amount Received Tokens Number>
      tokens_sent: <Amount Sent Tokens Number>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.default || !lnd.default.listPeers) {
          return cbk([400, 'ExpectedAuthenticatedLndToGetConnectedPeers']);
        }

        return cbk();
      },

      // List the set of connected peers
      listPeers: ['validate', ({}, cbk) => {
        return lnd.default.listPeers({}, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedGetPeersError', {err}]);
          }

          return cbk(null, res);
        });
      }],

      // Check the list of peers and map into final format
      peers: ['listPeers', ({listPeers}, cbk) => {
        if (!listPeers || !isArray(listPeers.peers)) {
          return cbk([503, 'ExpectedPeersArrayWhenListingPeers']);
        }

        return asyncMap(listPeers.peers, (peer, cbk) => {
          if (typeof peer.address !== 'string') {
            return cbk([503, 'ExpectedPeerAddress']);
          }

          if (typeof peer.bytes_recv !== 'string') {
            return cbk([503, 'ExpectedBytesRecv']);
          }

          if (typeof peer.bytes_sent !== 'string') {
            return cbk([503, 'ExpectedBytesSent']);
          }

          if (peer.inbound !== true && peer.inbound !== false) {
            return cbk([503, 'ExpectedPeerInbound']);
          }

          if (typeof peer.ping_time !== 'string') {
            return cbk([503, 'ExpectedPingTime']);
          }

          if (typeof peer.pub_key !== 'string') {
            return cbk([503, 'ExpectedPublicKey']);
          }

          if (typeof peer.sat_recv !== 'string') {
            return cbk([503, 'ExpectedSatRecv']);
          }

          if (typeof peer.sat_sent !== 'string') {
            return cbk([503, 'ExpectedSatSent']);
          }

          let isSyncPeer;

          switch (peer.sync_type) {
          case 'ACTIVE_SYNC':
            isSyncPeer = true;
            break;

          case 'PASSIVE_SYNC':
            isSyncPeer = false;
            break;

          default:
            isSyncPeer = undefined;
            break;
          }

          return cbk(null, {
            bytes_received: parseInt(peer.bytes_recv, decBase),
            bytes_sent: parseInt(peer.bytes_sent, decBase),
            features: Object.keys(peer.features || {}).map(bit => ({
              bit,
              is_known: peer.features[bit].is_known,
              is_required: peer.features[bit].is_required,
              type: featureFlagDetails({bit}).type,
            })),
            is_inbound: peer.inbound,
            is_sync_peer: isSyncPeer,
            ping_time: ceil(parseInt(peer.ping_time, decBase) / microPerMilli),
            public_key: peer.pub_key,
            socket: peer.address,
            tokens_received: parseInt(peer.sat_recv, decBase),
            tokens_sent: parseInt(peer.sat_sent, decBase),
          });
        },
        cbk);
      }],

      // Final set of peers
      finalPeers: ['peers', ({peers}, cbk) => cbk(null, {peers})],
    },
    returnResult({reject, resolve, of: 'finalPeers'}, cbk));
  });
};
