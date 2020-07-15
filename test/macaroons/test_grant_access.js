const {test} = require('@alexbosworth/tap');

const {grantAccess} = require('./../../');

const tests = [
  {
    args: {},
    description: 'An access privilege is required to grant access',
    error: [400, 'ExpectedAccessPrivilegeToGrantAccessCredential'],
  },
  {
    args: {is_ok_to_create_chain_addresses: true},
    description: 'LND is required to grant access',
    error: [400, 'ExpectedLndToGrantAccessCredential'],
  },
  {
    args: {
      is_ok_to_create_chain_addresses: true,
      lnd: {default: {bakeMacaroon: ({}, cbk) => cbk('err')}},
    },
    description: 'LND is required to grant access',
    error: [503, 'UnexpectedErrorFromBakeMacaroon', {err: 'err'}],
  },
  {
    args: {
      is_ok_to_create_chain_addresses: true,
      lnd: {default: {bakeMacaroon: ({}, cbk) => cbk('err')}},
    },
    description: 'Errors from the RPC are relayed',
    error: [503, 'UnexpectedErrorFromBakeMacaroon', {err: 'err'}],
  },
  {
    args: {
      is_ok_to_create_chain_addresses: true,
      lnd: {
        default: {
          bakeMacaroon: ({}, cbk) => cbk({
            details: 'unknown service lnrpc.Lightning',
          }),
        },
      },
    },
    description: 'Not supported is returned',
    error: [503, 'GrantAccessMethodNotSupported'],
  },
  {
    args: {
      is_ok_to_create_chain_addresses: true,
      lnd: {default: {bakeMacaroon: ({}, cbk) => cbk()}},
    },
    description: 'A response is expected',
    error: [503, 'ExpectedResponseFromBackMacaroonRequest'],
  },
  {
    args: {
      is_ok_to_create_chain_addresses: true,
      lnd: {default: {bakeMacaroon: ({}, cbk) => cbk(null, {macaroon: 'fo'})}},
    },
    description: 'A hex macaroon is expected',
    error: [503, 'ExpectedHexSerializedMacaroonCredentials'],
  },
  {
    args: {
      is_ok_to_create_chain_addresses: true,
      lnd: {
        default: {
          bakeMacaroon: (args, cbk) => {
            if (!args.permissions || args.permissions.length !== 1) {
              return cbk('ExpectedPermissions');
            }

            const [{action, entity}] = args.permissions;

            if (action !== 'write' || entity !== 'address') {
              return cbk('ExpectedPermissionEntity');
            }

            return cbk(null, {macaroon: '00'});
          },
        },
      },
    },
    description: 'Macaroon returned',
    expected: {macaroon: 'AA=='},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, equal, rejects}) => {
    if (!!error) {
      rejects(() => grantAccess(args), error, 'Got expected error');
    } else {
      const {macaroon} = await grantAccess(args);

      equal(macaroon, expected.macaroon, 'Got expected macaroon');
    }

    return end();
  });
});
