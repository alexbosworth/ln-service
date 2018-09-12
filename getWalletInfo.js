const {promisify} = require('util');

const {getWalletInfo} = require('./lightning');

/** Get overall wallet info.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    active_channels_count: <Active Channels Count Number>
    block_height: <Best Chain Height Number>
    is_testnet: <Using Testnet Bool>
    peers_count: <Peer Count Number>
    pending_channels_count: <Pending Channels Count Number>
    public_key: <Public Key String>
    type: <Type String>
  }
*/
module.exports = promisify(getWalletInfo);

