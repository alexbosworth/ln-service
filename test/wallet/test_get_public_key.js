const {test} = require('tap');

const {getPublicKey} = require('./../../');

const tests = [
  {
    args: {},
    description: 'Key family is required',
    error: [400, 'ExpectedKeyFamilyToGetPublicKey'],
  },
  {
    args: {family: 1},
    description: 'Index is required',
    error: [400, 'ExpectedKeyIndexToGetPublicKey'],
  },
  {
    args: {family: 1, index: 1},
    description: 'LND is required',
    error: [400, 'ExpectedWalletRpcLndToGetPublicKey'],
  },
  {
    args: {family: 1, index: 1, lnd: {}},
    description: 'LND is required',
    error: [400, 'ExpectedWalletRpcLndToGetPublicKey'],
  },
  {
    args: {family: 1, index: 1, lnd: {wallet: {}}},
    description: 'LND is required',
    error: [400, 'ExpectedWalletRpcLndToGetPublicKey'],
  },
  {
    args: {
      family: 1,
      index: 1,
      lnd: {wallet: {deriveKey: ({}, cbk) => cbk('err')}},
    },
    description: 'Unexpected errors are passed back',
    error: [503, 'UnexpectedErrGettingPublicKeyFromSeed', {err: 'err'}],
  },
  {
    args: {
      family: 1,
      index: 1,
      lnd: {wallet: {deriveKey: ({}, cbk) => cbk()}},
    },
    description: 'Expects result back',
    error: [503, 'UnexpectedResultInDerivePublicKeyResponse'],
  },
  {
    args: {
      family: 1,
      index: 1,
      lnd: {wallet: {deriveKey: ({}, cbk) => cbk(null, {})}},
    },
    description: 'Expects result back',
    error: [503, 'ExpectedRawPubKeyBytesInDerivePubKeyResponse'],
  },
  {
    args: {
      family: 1,
      index: 1,
      lnd: {
        wallet: {
          deriveKey: ({}, cbk) => cbk(null, {raw_key_bytes: Buffer.alloc(1)}),
        },
      },
    },
    description: 'Got public key result',
    expected: {public_key: '00'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getPublicKey(args), error, 'Got expected error');
    } else {
      const res = await getPublicKey(args);

      equal(res.public_key, expected.public_key, 'Got expected public key');
    }

    return end();
  });
});
