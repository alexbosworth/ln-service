const {promisify} = require('util');

const {getWalletInfo} = require('./lightning');

/** Get overall wallet info.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    active_channels_count: <Active Channels Count Number>
    alias: <Node Alias String>
    current_block_hash: <Best Chain Hash Hex String>
    current_block_height: <Best Chain Height Number>
    is_synced_to_chain: <Is Synced To Chain Bool>
    is_testnet: <Using Testnet Bool>
    latest_block_at: <Latest Known Block At Date String>
    peers_count: <Peer Count Number>
    pending_channels_count: <Pending Channels Count Number>
    public_key: <Public Key String>
    type: <Row Type String>
  }
*/
module.exports = promisify(getWalletInfo);

