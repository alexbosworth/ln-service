const {test} = require('tap');

const {getWalletInfo} = require('./../../');

const makeLnd = ({err}) => {
  if (!!err) {
    return {default: {getInfo: ({}, cbk) => cbk(err)}};
  }

  return {
    default: {
      getInfo: ({}, cbk) => cbk(null, {
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
      }),
    },
  };
};

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedAuthenticatedLndGrpcForGetInfoRequest'],
  },
  {
    args: {lnd: makeLnd({})},
    description: 'Wallet details are returned',
    expected: {
      chains: ['6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000'],
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
