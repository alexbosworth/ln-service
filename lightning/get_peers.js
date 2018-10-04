const asyncAuto = require('async/auto');
const asyncMap = require('async/map');

const peerType = require('./conf/row_types').peer;
const {returnResult} = require('./../async-util');

const decBase = 10;
const msPerSec = 1e3;
const {round} = Math;

/** Get connected peers.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    peers: [{
      bytes_received: <Bytes Received Number>
      bytes_sent: <Bytes Sent Number>
      is_inbound: <Is Inbound Peer Bool>
      ping_time: <Milliseconds Number>
      public_key: <Public Key String>
      socket: <Network Address And Port String>
      tokens_received: <Amount Received Tokens Number>
      tokens_sent: <Amount Sent Tokens Number>
      type: <Row Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // List the set of connected peers
    listPeers: cbk => lnd.listPeers({}, (err, res) => {
      return !!err ? cbk([503, 'UnexpectedGetPeersErr', err]) : cbk(null, res);
    }),

    // Check the list of peers and map into final format
    peers: ['listPeers', ({listPeers}, cbk) => {
      if (!listPeers || !Array.isArray(listPeers.peers)) {
        return cbk([503, 'ExpectedPeersArray', listPeers]);
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
          return cbk([503, 'ExpectedPeerInbound', peer]);
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

        return cbk(null, {
          bytes_received: parseInt(peer.bytes_recv, decBase),
          bytes_sent: parseInt(peer.bytes_sent, decBase),
          is_inbound: peer.inbound,
          ping_time: round(parseInt(peer.ping_time, decBase) / msPerSec),
          public_key: peer.pub_key,
          socket: peer.address,
          tokens_received: parseInt(peer.sat_recv, decBase),
          tokens_sent: parseInt(peer.sat_sent, decBase),
          type: peerType,
        });
      },
      cbk);
    }],

    finalPeers: ['peers', ({peers}, cbk) => {
      return cbk(null, {peers});
    }],
  },
  returnResult({of: 'finalPeers'}, cbk));
};

