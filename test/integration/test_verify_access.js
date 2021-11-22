const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {grantAccess} = require('./../../');
const {verifyAccess} = require('./../../');

const invalidPermissions = ['address:write'];
const permissions = ['address:read'];

// Verifying access should result in access verified
test(`Verify access`, async ({end, equal, rejects, strictSame}) => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const {macaroon} = await grantAccess({lnd, permissions});

  // verifyAccess is not supported on LND 0.13.4 and below
  try {
    const validity = await verifyAccess({lnd, macaroon, permissions});

    strictSame(validity, {is_valid: true}, 'Macaroon is valid');

    const invalid = await verifyAccess({
      lnd,
      macaroon,
      permissions: invalidPermissions,
    });

    strictSame(invalid, {is_valid: false}, 'Message is not valid');
  } catch (err) {
    strictSame(err, [501, 'VerifyAccessMethodNotSupported'], 'Got error')
  }

  await kill({});

  return end();
});
