const asyncAuto = require('async/auto');
const asyncMap = require('async/map');

const {returnResult} = require('./../async-util');

const peerType = require('./conf/row_types').peer;

const intBase = 10;
const msPerSec = 1e3;

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
      network_address: <Network Address String>
      ping_time: <Milliseconds Number>
      public_key: <Public Key String>
      tokens_received: <Amount Received Satoshis Number>
      tokens_sent: <Amount Sent Satoshis Number>
      type: <Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // List the set of connected peers
    listPeers: cbk => lnd.listPeers({}, (err, res) => {
      return !!err ? cbk([503, 'GetPeersErr', err]) : cbk(null, res);
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
          bytes_received: parseInt(peer.bytes_recv, intBase),
          bytes_sent: parseInt(peer.bytes_sent, intBase),
          is_inbound: peer.inbound,
          network_address: peer.address,
          ping_time: Math.round(parseInt(peer.ping_time, intBase) / msPerSec),
          public_key: peer.pub_key,
          tokens_received: parseInt(peer.sat_recv, intBase),
          tokens_sent: parseInt(peer.sat_sent, intBase),
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

