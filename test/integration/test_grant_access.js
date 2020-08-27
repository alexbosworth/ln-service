const {test} = require('tap');

const {authenticatedLndGrpc} = require('./../../');
const {createChainAddress} = require('./../../');
const {grantAccess} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const format = 'np2wpkh';

// Granting access should result in access granted
test(`Get access credentials`, async ({deepIs, end, equal, rejects}) => {
  const spawned = await spawnLnd({});

  const {lnd, kill} = spawned;

  try {
    await grantAccess({lnd, is_ok_to_create_chain_addresses: true});
  } catch (err) {
    const [, type] = err;

    // Avoid this test on LND 0.8.2 and below
    if (type === 'GrantAccessMethodNotSupported') {
      kill();

      await waitForTermination({lnd});

      return end();
    }
  }

  const makeChainAddresses = await grantAccess({
    lnd,
    is_ok_to_create_chain_addresses: true,
    permissions: ['address:read'],
  });

  const permissions = ['address:write', 'address:read'];

  deepIs(makeChainAddresses.permissions, permissions, 'Got permissions');

  const canPay = authenticatedLndGrpc({
    cert: spawned.lnd_cert,
    macaroon: (await grantAccess({lnd, is_ok_to_pay: true})).macaroon,
    socket: spawned.socket,
  });

  const makeAddress = authenticatedLndGrpc({
    cert: spawned.lnd_cert,
    macaroon: makeChainAddresses.macaroon,
    socket: spawned.lnd_socket,
  });

  await rejects(
    grantAccess({lnd: makeAddress.lnd, is_ok_to_create_chain_addresses: true}),
    [403, 'PermissionDeniedToBakeMacaroon'],
    'Cannot grant access using a non-generate macaroon'
  );

  await rejects(
    createChainAddress({format, lnd: canPay.lnd}),
    [503, 'UnexpectedErrorCreatingAddress'],
    'Cannot create a chain address using an offchain pay macaroon'
  );

  const {address} = await createChainAddress({format, lnd: makeAddress.lnd});

  equal(!!address, true, 'Can make address with proper credential');

  kill();

  await waitForTermination({lnd});

  return end();
});
