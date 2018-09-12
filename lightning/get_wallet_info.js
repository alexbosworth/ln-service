const {isBoolean} = require('lodash');
const {isNumber} = require('lodash');

const rowTypes = require('./conf/row_types');

/** Get overall wallet info.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
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
module.exports = ({lnd}, cbk) => {
  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  return lnd.getInfo({}, (err, res) => {
    if (!!err && err.details === 'unknown service lnrpc.Lightning') {
      return cbk([503, 'LndLocked']);
    }

    if (!!err) {
      return cbk([503, 'GetWalletInfoErr', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedWalletResponse']);
    }

    if (!res.identity_pubkey) {
      return cbk([503, 'ExpectedIdentityPubkey', res]);
    }

    if (!isNumber(res.num_pending_channels)) {
      return cbk([503, 'ExpectedNumPendingChannels', res]);
    }

    if (!isNumber(res.num_active_channels)) {
      return cbk([503, 'ExpectedNumActiveChannels', res]);
    }

    if (!isNumber(res.num_peers)) {
      return cbk([503, 'ExpectedNumPeers', res]);
    }

    if (!isNumber(res.block_height)) {
      return cbk([500, 'ExpectedBlockHeight', res]);
    }

    if (!isBoolean(res.testnet)) {
      return cbk([503, 'Expected testnet flag', res]);
    }

    return cbk(null, {
      active_channels_count: res.num_active_channels,
      block_height: res.block_height,
      is_testnet: res.testnet,
      peers_count: res.num_peers,
      pending_channels_count: res.num_pending_channels,
      public_key: res.identity_pubkey,
      type: rowTypes.wallet,
    });
  });
};

