const _ = require('lodash');
const asyncAuto = require('async/auto');

const getChannels = require('./get_channels');
const getPeers = require('./get_peers');

/** Get all connections, offline and online.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
    channels: [{
      id: <Channel Id String>
      is_active: <Channel Active Bool>
      local_balance: <Local Balance Satoshis Number>
      received: <Received Satoshis Number>
      remote_balance: <Remote Balance Satoshis Number>
      sent: <Sent Satoshis Number>
      transaction_id: <Blockchain Transaction Id>
      transaction_vout: <Blockchain Transaction Vout Number>
      transfers_count: <Channel Transfers Total Number>
      unsettled_balance: <Unsettled Balance Satoshis Number>
    }]
    peers: [{
      bytes_received: <Bytes Received Number>
      bytes_sent: <Bytes Sent Number>
      id: <Peer Id Number>
      network_address: <Network Address String>
      ping_time: <Milliseconds Number>
      tokens_received: <Amount Received Satoshis Number>
      tokens_sent: <Amount Sent Satoshis Number>
    }]
    public_key: <Public Key String>
  }]
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    getChannels: (cbk) => {
      return getChannels({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    getPeers: (cbk) => {
      return getPeers({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    connections: ['getChannels', 'getPeers', (res, cbk) => {
      const channels = _.groupBy(res.getChannels, 'partner_public_key');
      const peers = _.groupBy(res.getPeers, 'public_key');

      const allPublicKeys = Object.keys(channels).concat(Object.keys(peers));

      const connections = _.uniq(allPublicKeys).map((publicKey) => {
        return {
          channels: channels[publicKey] || [],
          peers: peers[publicKey],
          public_key: publicKey,
        };
      });

      return cbk(null, connections);
    }],
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    return cbk(null, res.connections);
  });
};

