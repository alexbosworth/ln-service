const {isBoolean} = require('lodash');
const {isNumber} = require('lodash');

const rowTypes = require('./conf/row_types');

const lockedLndErrorMessage = 'unknown service lnrpc.Lightning';
const msPerSec = 1e3;

/** Get overall wallet info.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
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
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.getInfo) {
    return cbk([400, 'ExpectedLndForGetInfoRequest']);
  }

  return lnd.getInfo({}, (err, res) => {
    if (!!err && err.details === lockedLndErrorMessage) {
      return cbk([503, 'LndLocked']);
    }

    if (!!err) {
      return cbk([503, 'GetWalletInfoErr', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedWalletResponse']);
    }

    if (typeof res.alias !== 'string') {
      return cbk([503, 'ExpectedWalletAlias']);
    }

    if (typeof res.block_hash !== 'string') {
      return cbk([503, 'ExpectedCurrentBlockHash']);
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

    if (!isBoolean(res.synced_to_chain)) {
      return cbk([400, 'ExpectedSyncedToChainStatus', res]);
    }

    if (!isBoolean(res.testnet)) {
      return cbk([503, 'Expected testnet flag', res]);
    }

    if (typeof res.version !== 'string') {
      return cbk([503, 'ExpectedWalletLndVersion']);
    }

    const latestBlockAt = new Date(res.best_header_timestamp * msPerSec);

    return cbk(null, {
      active_channels_count: res.num_active_channels,
      alias: res.alias,
      current_block_hash: res.block_hash,
      current_block_height: res.block_height,
      is_synced_to_chain: res.synced_to_chain,
      is_testnet: res.testnet,
      latest_block_at: latestBlockAt.toISOString(),
      peers_count: res.num_peers,
      pending_channels_count: res.num_pending_channels,
      public_key: res.identity_pubkey,
      type: rowTypes.wallet,
      version: res.version,
    });
  });
};

