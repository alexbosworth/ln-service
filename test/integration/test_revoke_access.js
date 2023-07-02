const {rejects} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {grantAccess} = require('./../../');
const {revokeAccess} = require('./../../');

const err = [503, 'UnexpectedErrorCreatingAddress'];
const id = '1';
const permissions = ['address:read'];

// Revoking access should result in access denied
test(`Revoke access credentials`, async () => {
  const [{lnd, kill, rpc}] = (await spawnLightningCluster({})).nodes;

  try {
    await grantAccess({lnd, is_ok_to_create_chain_addresses: true});

    const makeChainAddresses = await grantAccess({
      id,
      lnd,
      permissions,
      is_ok_to_create_chain_addresses: true,
    });

    const macLnd = rpc({macaroon: makeChainAddresses.macaroon});

    await revokeAccess({id, lnd});

    await rejects(createChainAddress({lnd: macLnd.lnd}), err, 'Fails');
  } catch (err) {
    strictEqual(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
