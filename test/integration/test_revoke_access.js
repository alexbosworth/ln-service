const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {grantAccess} = require('./../../');
const {revokeAccess} = require('./../../');

const err = [503, 'UnexpectedErrorCreatingAddress'];
const format = 'np2wpkh';
const id = '1';
const permissions = ['address:read'];

// Revoking access should result in access denied
test(`Revoke access credentials`, async ({end, equal, rejects}) => {
  const [{lnd, kill, rpc}] = (await spawnLightningCluster({})).nodes;

  await grantAccess({lnd, is_ok_to_create_chain_addresses: true});

  const makeChainAddresses = await grantAccess({
    id,
    lnd,
    permissions,
    is_ok_to_create_chain_addresses: true,
  });

  try {
    await revokeAccess({id, lnd});
  } catch (err) {
    const [, type] = err;

    // Avoid this test on LND 0.11.0 and below
    if (type === 'RevokeAccessMethodNotSupported') {
      await kill({});

      return end();
    }
  }

  const macLnd = rpc({macaroon: makeChainAddresses.macaroon});

  await rejects(createChainAddress({format, lnd: macLnd.lnd}), err, 'Fails');

  await kill({});

  return end();
});
