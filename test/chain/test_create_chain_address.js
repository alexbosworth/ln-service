const {test} = require('tap');

const {createChainAddress} = require('./../../');

const tests = [
  {
    args: {},
    description: 'An address format is required',
    error: [400, 'ExpectedKnownAddressFormat'],
  },
  {
    args: {format: 'foo'},
    description: 'A known address format is required',
    error: [400, 'ExpectedKnownAddressFormat'],
  },
  {
    args: {format: 'p2wpkh'},
    description: 'LND is required',
    error: [400, 'ExpectedLndForAddressCreation'],
  },
  {
    args: {format: 'p2wpkh', lnd: {}},
    description: 'LND with default is required',
    error: [400, 'ExpectedLndForAddressCreation'],
  },
  {
    args: {format: 'p2wpkh', lnd: {default: {}}},
    description: 'LND with default is required',
    error: [400, 'ExpectedLndForAddressCreation'],
  },
  {
    args: {
      format: 'p2wpkh',
      lnd: {
        default: {
          newAddress: ({}, cbk) => cbk({
            message: '14 UNAVAILABLE: Connect Failed',
          }),
        },
      },
    },
    description: 'Connection failure error is returned',
    error: [503, 'FailedToConnectToDaemonToCreateChainAddress'],
  },
  {
    args: {
      format: 'p2wpkh',
      lnd: {default: {newAddress: ({}, cbk) => cbk('err')}},
    },
    description: 'Unanticipated errors are returned',
    error: [503, 'UnexpectedErrorCreatingAddress', {err: 'err'}],
  },
  {
    args: {format: 'p2wpkh', lnd: {default: {newAddress: ({}, cbk) => cbk()}}},
    description: 'A result is required',
    error: [503, 'ExpectedResponseForAddressCreation'],
  },
  {
    args: {
      format: 'p2wpkh',
      lnd: {default: {newAddress: ({}, cbk) => cbk(null, {})}},
    },
    description: 'An address is required',
    error: [503, 'ExpectedAddressInCreateAddressResponse'],
  },
  {
    args: {
      format: 'p2wpkh',
      lnd: {default: {newAddress: ({}, cbk) => cbk(null, {address: 'addr'})}},
    },
    description: 'An address is required',
    expected: {address: 'addr'},
  },
  {
    args: {
      format: 'p2wpkh',
      is_unused: true,
      lnd: {
        default: {
          newAddress: (args, cbk) => {
            if (args.type !== 2) {
              return cbk([500, 'FailedToSetUnusedFlagForAddress', args.type]);
            }

            return cbk(null, {address: 'addr'});
          },
        },
      },
    },
    description: 'An unused address gets an unused address',
    expected: {address: 'addr'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => createChainAddress(args), error, 'Got expected error');
    } else {
      const {address} = await createChainAddress(args);

      equal(address, expected.address, 'Got expected new address');
    }

    return end();
  });
});
