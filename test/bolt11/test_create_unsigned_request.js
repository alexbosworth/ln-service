const sign = require('secp256k1').ecdsaSign;

const {test} = require('tap');

const {createSignedRequest} = require('./../../');
const {createUnsignedRequest} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const wordsAsBuffer = require('./../../bolt11/words_as_buffer');

const bufFromHex = hex => Buffer.from(hex, 'hex');

const tests = [
  {
    args: {
      created_at: '2017-06-01T10:57:38.000Z',
      description_hash: '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      mtokens: '2000000000',
      network: 'bitcoin',
    },
    description: 'Test creating a regular unsigned request',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c202404082e1a1c92db7b3f161a001b7689049eea2701b46f8db7513629edf2408fac7eaedc60800',
      hash: 'b6025e8a10539dddbcbe6840a9650707ae3f147b8dcfda338561ada710508916',
      hrp: 'lnbc20m',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      created_at: '2017-06-01T10:57:38.000Z',
      description: 'Please consider supporting this project',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      network: 'bitcoin',
    },
    description: 'Test creating a donation payment request',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c202404081a1fa83632b0b9b29031b7b739b4b232b91039bab83837b93a34b733903a3434b990383937b532b1ba0',
      hash: 'c3d4e83f646fa79a393d75277b1d858db1d1f7ab7137dcb7835db2ecd518e1c9',
      hrp: 'lnbc',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      created_at: '2017-06-01T10:57:38.000Z',
      description: '1 cup coffee',
      expires_at: '2017-06-01T10:58:38.000Z',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      mtokens: '250000000',
      network: 'bitcoin',
    },
    description: 'Payment request with expiration time',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c202404080c01078d050c4818dd5c0818dbd9999959400',
      hash: '41545c21535123568d875cf108983e97323857e05d302e8c0c8091540f496b6e',
      hrp: 'lnbc2500u',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      created_at: '2017-06-01T10:57:38.000Z',
      description: 'ナンセンス 1杯',
      expires_at: '2017-06-01T10:58:38.000Z',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      network: 'bitcoin',
      tokens: 250000,
    },
    description: 'Payment request with utf8 characters in description',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c202404080c01078d0838e0e2b8e0ecf8e0aef8e0ecf8e0ae480c79a76bc',
      hash: 'a66929bfdba1ef8480f41f0a509646d100971a1b1ef074ecc2ad283ef872fb78',
      hrp: 'lnbc2500u',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      created_at: '2017-06-01T10:57:38.000Z',
      description_hash: '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      mtokens: '2000000000',
      network: 'bitcoin',
    },
    description: 'Payment request with hash of list of items',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c202404082e1a1c92db7b3f161a001b7689049eea2701b46f8db7513629edf2408fac7eaedc60800',
      hash: 'b6025e8a10539dddbcbe6840a9650707ae3f147b8dcfda338561ada710508916',
      hrp: 'lnbc20m',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      chain_addresses: ['mk2QpYatsKicvFVuTAQLBryyccRXMUaGHP'],
      created_at: '2017-06-01T10:57:38.000Z',
      description_hash: '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      mtokens: '2000000000',
      network: 'testnet',
    },
    description: 'Payment request with a fallback address',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c202404081210c4c5cad5953d9a0f23ec51a5674d1f38c0f2b9329ee1a1c92db7b3f161a001b7689049eea2701b46f8db7513629edf2408fac7eaedc6080',
      hash: '8a70928b442c583b3c2206bd72c2edf3bbe514444134285d6abbc6e98c552d92',
      hrp: 'lntb20m',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      chain_addresses: ['1RustyRX2oai4EYYDpQGWvEL62BBGqN9T'],
      created_at: '2017-06-01T10:57:38.000Z',
      description_hash: '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      network: 'bitcoin',
      routes: [[
        {
          public_key: '029e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255',
        },
        {
          base_fee_mtokens: '1',
          channel: '66051x263430x1800',
          cltv_delta: 3,
          fee_rate: 20,
          public_key: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
        },
      ]],
      tokens: 2000000,
    },
    description: 'Payment request with routing hints',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c202404080629014f01d480dc2a9a7f8f49621e3a218fbe7390230307e7bd4ae1bf0a47bc63b92a8081018202830384000000008000000a0001890862096c3efb83d41b9328488c99880c9b8ac9b23d1370d0e496dbd9f8b0d000dbb44824f751380da37c6dba89b14f6f92047d63f576e3040',
      hash: '215f17ac50e01dbcce070aa15d9ebd29088c7e7e37eb8f6ae071770ca40dd47b',
      hrp: 'lnbc20m',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      chain_addresses: ['3EktnHQD7RiAE6uzMj2ZifT9YgRrkSgzQX'],
      created_at: '2017-06-01T10:57:38.000Z',
      description_hash: '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      network: 'bitcoin',
      tokens: 2000000,
    },
    description: 'Payment request with p2sh',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c202404081210ca3d5558ee6867cc870847a6e7ce337da1ba81e116e1a1c92db7b3f161a001b7689049eea2701b46f8db7513629edf2408fac7eaedc6080',
      hash: 'aff3372fd3da5db4d6cc7cd757c5ad2804ab76f7eb68a79617e4f9edf329cdb3',
      hrp: 'lnbc20m',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      chain_addresses: ['bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'],
      created_at: '2017-06-01T10:57:38.000Z',
      description_hash: '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      network: 'bitcoin',
      tokens: 2000000,
    },
    description: 'Payment request with p2wpkh',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c20240408121081d479dba066465b515250711746ce8c8fc50cef5ae1a1c92db7b3f161a001b7689049eea2701b46f8db7513629edf2408fac7eaedc6080',
      hash: '53c4634f904ae9e1888e5158d6b7e352c4352cb2e43bf60019352baa471551cd',
      hrp: 'lnbc20m',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      chain_addresses: ['bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3'],
      created_at: '2017-06-01T10:57:38.000Z',
      description_hash: '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      network: 'bitcoin',
      tokens: 2000000,
    },
    description: 'Payment request with p2wsh',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c20240408121a80618c50f0531459a012f46480cd5b684db26159e335349e86e318ca581240c9882e1a1c92db7b3f161a001b7689049eea2701b46f8db7513629edf2408fac7eaedc60800',
      hash: '827b34dedbcebfbead318c8ca5d0fdeffb47e79261035980b059dcf66ae83ade',
      hrp: 'lnbc20m',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
  {
    args: {
      created_at: '2017-06-01T10:57:38.000Z',
      description: 'coffee beans',
      features: [
        {
          bit: 15,
          is_required: false,
          type: 'payment_identifier',
        },
        {
          bit: 99,
          is_required: false,
          type: undefined,
        },
      ],
      id: '0001020304050607080900010203040506070809000102030405060708090102',
      network: 'bitcoin',
      payment: '1111111111111111111111111111111111111111111111111111111111111111',
      tokens: 2000000,
    },
    description: 'With features and payment identifier',
    expected: {
      data: '0b25fe64410d00004080c1014181c20240004080c1014181c20240004080c1014181c202404080a0a40000000000000000000040003414636f66666565206265616e730806822222222222222222222222222222222222222222222222222222222222222220',
      hash: 'ca79ddcfb01fc3232cf784075742a259afa0d3506c0db278b95175154a89bda5',
      hrp: 'lnbc20m',
    },
    verify: {
      destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
      private_key: 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734',
    },
  },
];

tests.forEach(({args, description, expected, verify}) => {
  return test(description, ({deepIs, end, equal}) => {
    const {hash, hrp, tags} = createUnsignedRequest(args);

    const data = wordsAsBuffer({words: tags}).toString('hex');

    equal(data, expected.data, 'Tags calculated for payment request');
    equal(hash, expected.hash, 'Hash calculated for payment request');
    equal(hrp, expected.hrp, 'Hrp calculated for payment request');

    const {signature} = sign(bufFromHex(hash), bufFromHex(verify.private_key));

    const {request} = createSignedRequest({
      hrp,
      tags,
      destination: verify.destination,
      signature: Buffer.from(signature).toString('hex'),
    });

    const parsed = parsePaymentRequest({request});

    deepIs(parsed.chain_addresses, args.chain_addresses, 'Expected fallbacks');
    equal(parsed.cltv_delta, args.cltv_delta || 9, 'Request cltv is expected');
    equal(parsed.created_at, args.created_at, 'Request create_at is expected');
    equal(parsed.description, args.description, 'Req description expected');
    equal(parsed.description_hash, args.description_hash, 'Got Desc hash');
    equal(parsed.destination, verify.destination, 'Destination key expected');

    if (!!args.features) {
      deepIs(parsed.features, args.features, 'Got expected feature bits');
    }

    if (!!args.mtokens) {
      equal(parsed.mtokens, args.mtokens, 'Payment request mtokens expected');
    }

    if (!!args.payment) {
      equal(parsed.payment, args.payment, 'Payment identifier expected');
    }

    if (!!args.routes) {
      deepIs(parsed.routes, args.routes, 'Payment request routes as expected');
    }

    if (!!args.tokens) {
      equal(parsed.tokens, args.tokens, 'Payment request tokens as expected');
    }

    return end();
  });
});
