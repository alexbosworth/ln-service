const {test} = require('tap');

const {createSeed} = require('./../../');

const message = '14 UNAVAILABLE: Connect Failed';

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedNonAuthenticatedLndForSeedCreation'],
  },
  {
    args: {lnd: {unlocker: {genSeed: ({}, cbk) => cbk({message})}}},
    description: 'Connection failure errors returned',
    error: [503, 'UnexpectedConnectionFailure'],
  },
  {
    args: {
      lnd: {unlocker: {genSeed: ({}, cbk) => cbk('err')}},
      passphrase: 'passphrase',
    },
    description: 'Unexpected errors passed back',
    error: [503, 'UnexpectedCreateSeedError', {err: 'err'}],
  },
  {
    args: {lnd: {unlocker: {genSeed: ({}, cbk) => cbk()}}},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseForSeedCreation'],
  },
  {
    args: {
      lnd: {
        unlocker: {
          genSeed: ({}, cbk) => cbk(null, {cipher_seed_mnemonic: 'seed'}),
        },
      },
    },
    description: 'A cipher seed mnemonic is expected',
    error: [503, 'ExpectedCipherSeedMnemonic'],
  },
  {
    args: {
      lnd: {
        unlocker: {
          genSeed: ({}, cbk) => cbk(null, {
            cipher_seed_mnemonic: Array.from({length: 23}),
          }),
        },
      },
    },
    description: 'A long cipher seed mnemonic is expected',
    error: [503, 'UnexpectedCipherSeedMnemonicLength'],
  },
  {
    args: {
      lnd: {
        unlocker: {
          genSeed: ({}, cbk) => cbk(null, {
            cipher_seed_mnemonic: Array.from({length: 24}).map(n => 'foo'),
          }),
        },
      },
    },
    description: 'A long cipher seed mnemonic is expected',
    expected: {seed: Array.from({length: 24}).map(n => 'foo').join(' ')},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => createSeed(args), error, 'Got expected error');
    } else {
      const {seed} = await createSeed(args);

      equal(seed, expected.seed, 'Got expected seed');
    }

    return end();
  });
});
