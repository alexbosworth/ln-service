const asyncAuto = require('async/auto');
const {groupBy} = require('lodash');
const {uniq} = require('lodash');

const getChannels = require('./../getChannels');
const getPeers = require('./../getPeers');
const getPendingChannels = require('./../getPendingChannels');
const {returnResult} = require('./../async-util');
const {rowTypes} = require('./../lightning');

/** Get all connections, offline and online.

  {
    lnd: <Object>
  }

  @returns via cbk
  {
    connections: [{
      channels: [{
        id: <Channel Id String>
        is_active: <Channel Active Bool>
        is_closing: <Channel Closing Bool>
        is_opening: <Channel Opening Bool>
        local_balance: <Local Balance Satoshis Number>
        received: <Received Satoshis Number>
        remote_balance: <Remote Balance Satoshis Number>
        sent: <Sent Satoshis Number>
        transaction_id: <Blockchain Transaction Id>
        transaction_vout: <Blockchain Transaction Vout Number>
        transfers_count: <Channel Transfers Total Number>
        [unsettled_balance]: <Unsettled Balance Satoshis Number>
      }]
      peers: [{
        bytes_received: <Bytes Received Number>
        bytes_sent: <Bytes Sent Number>
        network_address: <Network Address String>
        ping_time: <Milliseconds Number>
        tokens_received: <Amount Received Satoshis Number>
        tokens_sent: <Amount Sent Satoshis Number>
      }]
      public_key: <Public Key String>
      type: <Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Get channels
    getChannels: async cbk => getChannels({lnd}),

    // Get peers
    getPeers: async cbk => getPeers({lnd}),

    // Get pending channels
    pending: async cbk => getPendingChannels({lnd}),

    // Final list of connections
    connections: [
      'getChannels',
      'getPeers',
      'pending',
      ({getChannels, getPeers, pending}, cbk) =>
    {
      const channels = groupBy(getChannels.channels, 'partner_public_key');
      const peers = groupBy(getPeers.peers, 'public_key');
      const pChans = groupBy(pending.pending_channels, 'partner_public_key');

      const allPublicKeys = Object.keys(channels).concat(Object.keys(peers));

      const connections = uniq(allPublicKeys).map(publicKey => {
        const openChannels = channels[publicKey] || [];
        const pendingChannels = pChans[publicKey] || [];

        return {
          channels: openChannels.concat(pendingChannels),
          peers: peers[publicKey] || [],
          public_key: publicKey,
          type: rowTypes.connection,
        };
      });

      return cbk(null, {connections});
    }],
  },
  returnResult({of: 'connections'}, cbk));
};

