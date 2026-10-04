const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {grantAccess} = require('./../../');
const {verifyAccess} = require('./../../');

const invalidPermissions = ['address:write'];
const permissions = ['address:read'];

// Verifying access should result in access verified
test(`Verify access`, async () => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const {macaroon} = await grantAccess({lnd, permissions});

  const validity = await verifyAccess({lnd, macaroon, permissions});

  deepEqual(validity, {is_valid: true}, 'Macaroon is valid');

  const invalid = await verifyAccess({
    lnd,
    macaroon,
    permissions: invalidPermissions,
  });

  deepEqual(invalid, {is_valid: false}, 'Message is not valid');

  await kill({});

  return;
});
