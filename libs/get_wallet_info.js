const _ = require('lodash');

const rowTypes = require('./../config/row_types');

/** Get overall wallet info.

  {
    lnd_grpc_api: <Object>
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
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.getInfo({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get wallet info error', err]); }

    if (!res) { return cbk([500, 'Expected wallet info', res]); }

    if (!res.identity_pubkey) {
      return cbk([500, 'Expected identity pubkey', res]);
    }

    if (!_(res.num_pending_channels).isNumber()) {
      return cbk([500, 'Expected num pending channels', res]);
    }

    if (!_(res.num_active_channels).isNumber()) {
      return cbk([500, 'Expected num active channels', res]);
    }

    if (!_(res.num_peers).isNumber()) {
      return cbk([500, 'Expected num peers', res]);
    }

    if (!_(res.block_height).isNumber()) {
      return cbk([500, 'Expected block height', res]);
    }

    if (!_(res.testnet).isBoolean()) {
      return cbk([500, 'Expected testnet flag', res]);
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

