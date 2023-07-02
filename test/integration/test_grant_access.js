const {deepStrictEqual} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {grantAccess} = require('./../../');

const format = 'np2wpkh';

// Granting access should result in access granted
test(`Get access credentials`, async () => {
  const [{lnd, kill, rpc}] = (await spawnLightningCluster({})).nodes;

  await grantAccess({lnd, is_ok_to_create_chain_addresses: true});

  const makeChainAddresses = await grantAccess({
    lnd,
    is_ok_to_create_chain_addresses: true,
    permissions: ['address:read'],
  });

  const permissions = ['address:write', 'address:read'];

  deepStrictEqual(makeChainAddresses.permissions, permissions, 'Permissions');

  const canPay = rpc({
    macaroon: (await grantAccess({lnd, is_ok_to_pay: true})).macaroon,
  });

  const makeAddress = rpc({macaroon: makeChainAddresses.macaroon});

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

  deepStrictEqual(!!address, true, 'Can make address with proper credential');

  const createChainAddressCredential = await grantAccess({
    lnd,
    methods: ['createChainAddress'],
  });

  const authenticatedToCreateAddress = rpc({
    macaroon: createChainAddressCredential.macaroon,
  });

  const created = await createChainAddress({
    format,
    lnd: authenticatedToCreateAddress.lnd,
  });

  deepStrictEqual(!!created, true, 'Can make address with URI credential');

  await kill({});

  return;
});
