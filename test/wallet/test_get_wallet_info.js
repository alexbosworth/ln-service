const {test} = require('tap');

const {getWalletInfo} = require('./../../');

const makeLnd = ({err, override, response}) => {
  if (!!err) {
    return {default: {getInfo: ({}, cbk) => cbk(err)}};
  }

  if (!!response) {
    return {default: {getInfo: ({}, cbk) => cbk(null, response.res)}}
  }

  const wallet = {
    alias: 'alias',
    best_header_timestamp: 1,
    block_hash: 'block_hash',
    block_height: 1,
    chains: [{chain: 'bitcoin', network: 'mainnet'}],
    color: '#000000',
    features: {'9': {is_known: true, is_required: true}},
    identity_pubkey: Buffer.alloc(33).toString('hex'),
    num_active_channels: 1,
    num_peers: 1,
    num_pending_channels: 1,
    synced_to_chain: true,
    synced_to_graph: true,
    uris: ['uri'],
    version: 'version',
  };

  Object.keys(override || {}).forEach(key => wallet[key] = override[key]);

  return {default: {getInfo: ({}, cbk) => cbk(null, wallet)}};
};

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedAuthenticatedLndGrpcForGetInfoRequest'],
  },
  {
    args: {lnd: makeLnd({err: {details: 'unknown service lnrpc.Lightning'}})},
    description: 'LND locked returns locked message',
    error: [503, 'LndLocked'],
  },
  {
    args: {
      lnd: makeLnd({err: {details: 'failed to connect to all addresses'}}),
    },
    description: 'Failed to connect error returned',
    error: [503, 'FailedToConnectToDaemon'],
  },
  {
    args: {lnd: makeLnd({err: {details: 'Connect Failed'}})},
    description: 'Failed to connect error returned',
    error: [503, 'FailedToConnectToDaemon'],
  },
  {
    args: {
      lnd: makeLnd({
        err: {
          message: '14 UNAVAILABLE: channel is in state TRANSIENT_FAILURE',
        },
      }),
    },
    description: 'Transient failure returns error',
    error: [503, 'FailedToConnectToDaemon'],
  },
  {
    args: {lnd: makeLnd({err: 'err'})},
    description: 'LND error returned for get wallet info',
    error: [503, 'GetWalletInfoErr', {err: 'err'}],
  },
  {
    args: {lnd: makeLnd({response: {res: undefined}})},
    description: 'A wallet response is expected',
    error: [503, 'ExpectedWalletResponse'],
  },
  {
    args: {lnd: makeLnd({override: {alias: undefined}})},
    description: 'A wallet response is expected',
    error: [503, 'ExpectedWalletAlias'],
  },
  {
    args: {lnd: makeLnd({override: {best_header_timestamp: undefined}})},
    description: 'A best header timestamp is expected',
    error: [503, 'ExpectedBestHeaderTimestampInInfoResponse'],
  },
  {
    args: {lnd: makeLnd({override: {block_hash: undefined}})},
    description: 'A best block hash is expected',
    error: [503, 'ExpectedCurrentBlockHash'],
  },
  {
    args: {lnd: makeLnd({override: {block_height: undefined}})},
    description: 'A block height is expected',
    error: [503, 'ExpectedBlockHeight'],
  },
  {
    args: {lnd: makeLnd({override: {chains: undefined}})},
    description: 'Backing chains are expected',
    error: [503, 'ExpectedChainsAssociatedWithWallet'],
  },
  {
    args: {lnd: makeLnd({override: {color: undefined}})},
    description: 'A color is expected in response',
    error: [503, 'ExpectedWalletColorInWalletInfoResponse'],
  },
  {
    args: {lnd: makeLnd({override: {identity_pubkey: undefined}})},
    description: 'A public key is expected in response',
    error: [503, 'ExpectedIdentityPubkey'],
  },
  {
    args: {lnd: makeLnd({override: {num_active_channels: undefined}})},
    description: 'Active channel count is expected in response',
    error: [503, 'ExpectedNumActiveChannels'],
  },
  {
    args: {lnd: makeLnd({override: {num_peers: undefined}})},
    description: 'Number of peers is expected in response',
    error: [503, 'ExpectedNumPeers'],
  },
  {
    args: {lnd: makeLnd({override: {num_pending_channels: undefined}})},
    description: 'Number of pending channels is expected in response',
    error: [503, 'ExpectedNumPendingChannels'],
  },
  {
    args: {lnd: makeLnd({override: {synced_to_chain: undefined}})},
    description: 'Chain sync status is expected in response',
    error: [503, 'ExpectedSyncedToChainStatus'],
  },
  {
    args: {lnd: makeLnd({override: {uris: undefined}})},
    description: 'URIs are expected in response',
    error: [503, 'ExpectedArrayOfUrisInWalletInfoResponse'],
  },
  {
    args: {lnd: makeLnd({override: {version: undefined}})},
    description: 'Version is expected in response',
    error: [503, 'ExpectedWalletLndVersion'],
  },
  {
    args: {lnd: makeLnd({})},
    description: 'Wallet details are returned',
    expected: {
      chains: [
        '6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000',
      ],
      color: '#000000',
      active_channels_count: 1,
      alias: 'alias',
      current_block_hash: "block_hash",
      current_block_height: 1,
      features: [{
        bit: 9,
        is_known: true,
        is_required: true,
        type: 'tlv_onion',
      }],
      is_synced_to_chain: true,
      is_synced_to_graph: true,
      latest_block_at: '1970-01-01T00:00:01.000Z',
      peers_count: 1,
      pending_channels_count: 1,
      public_key: '000000000000000000000000000000000000000000000000000000000000000000',
      uris: ['uri'],
      version: "version",
    },
  },
  {
    args: {lnd: makeLnd({override: {synced_to_graph: false}})},
    description: 'Wallet details are returned',
    expected: {
      chains: [
        '6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000',
      ],
      color: '#000000',
      active_channels_count: 1,
      alias: 'alias',
      current_block_hash: "block_hash",
      current_block_height: 1,
      features: [{
        bit: 9,
        is_known: true,
        is_required: true,
        type: 'tlv_onion',
      }],
      is_synced_to_chain: true,
      is_synced_to_graph: undefined,
      latest_block_at: '1970-01-01T00:00:01.000Z',
      peers_count: 1,
      pending_channels_count: 1,
      public_key: '000000000000000000000000000000000000000000000000000000000000000000',
      uris: ['uri'],
      version: "version",
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, rejects}) => {
    if (!!error) {
      await rejects(getWalletInfo(args), error, 'Got expected error');
    } else {
      const res = await getWalletInfo(args);

      deepIs(res, expected, 'Got expected get wallet info response');
    }

    return end();
  });
});
