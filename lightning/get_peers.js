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
module.exports = async ({lnd}) => {
  const listPeers = await new Promise((resolve, reject) => {
    // List the set of connected peers
    lnd.listPeers({}, (err, res) => {
      return !!err ? reject([503, 'GetPeersErr', err]) : resolve(res);
    });
  });

  if (!listPeers || !Array.isArray(listPeers.peers)) {
    return Promise.reject([503, 'ExpectedPeersArray', listPeers]);
  }

  return await new Promise((resolve, reject) => {
    let finalPeers = listPeers.peers.map(peer => {
      if (typeof peer.address !== 'string') {
        return reject([503, 'ExpectedPeerAddress']);
      }

      if (typeof peer.bytes_recv !== 'string') {
        return reject([503, 'ExpectedBytesRecv']);
      }

      if (typeof peer.bytes_sent !== 'string') {
        return reject([503, 'ExpectedBytesSent']);
      }

      if (peer.inbound !== true && peer.inbound !== false) {
        return reject([503, 'ExpectedPeerInbound', peer]);
      }

      if (typeof peer.ping_time !== 'string') {
        return reject([503, 'ExpectedPingTime']);
      }

      if (typeof peer.pub_key !== 'string') {
        return reject([503, 'ExpectedPublicKey']);
      }

      if (typeof peer.sat_recv !== 'string') {
        return reject([503, 'ExpectedSatRecv']);
      }

      if (typeof peer.sat_sent !== 'string') {
        return reject([503, 'ExpectedSatSent']);
      }

      return {
        bytes_received: parseInt(peer.bytes_recv, intBase),
        bytes_sent: parseInt(peer.bytes_sent, intBase),
        is_inbound: peer.inbound,
        network_address: peer.address,
        ping_time: Math.round(parseInt(peer.ping_time, intBase) / msPerSec),
        public_key: peer.pub_key,
        tokens_received: parseInt(peer.sat_recv, intBase),
        tokens_sent: parseInt(peer.sat_sent, intBase),
        type: peerType,
      };
    });
    return resolve(finalPeers);
  });
};
