const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {getWalletVersion} = require('./../../');
const {grantAccess} = require('./../../');

const format = 'np2wpkh';

// Granting access should result in access granted
test(`Get access credentials`, async ({end, equal, rejects, strictSame}) => {
  const [{lnd, kill, rpc}] = (await spawnLightningCluster({})).nodes;

  await grantAccess({lnd, is_ok_to_create_chain_addresses: true});

  const makeChainAddresses = await grantAccess({
    lnd,
    is_ok_to_create_chain_addresses: true,
    permissions: ['address:read'],
  });

  const permissions = ['address:write', 'address:read'];

  strictSame(makeChainAddresses.permissions, permissions, 'Got permissions');

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

  equal(!!address, true, 'Can make address with proper credential');

  const {version} = await getWalletVersion({lnd});

  // Granting URI access is not supported in LND 0.11.0
  if (version !== 'v0.11.0-beta') {
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

    equal(!!created, true, 'Can make address with URI credential');
  }

  await kill({});

  return end();
});
