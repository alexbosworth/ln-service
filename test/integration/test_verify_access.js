const {test} = require('@alexbosworth/tap');

const {authenticatedLndGrpc} = require('./../../');
const {grantAccess} = require('./../../');
const {verifyAccess} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const permissions = ['address:read'];

// Verifying access should result in access verified
test(`Verify access`, async ({end, equal, rejects, strictSame}) => {
  const spawned = await spawnLnd({is_remote_skipped: true});

  const {lnd, kill} = spawned;

  const {macaroon} = await grantAccess({lnd, permissions});

  // verifyAccess is not supported on LND 0.13.3 and below
  try {
    const validity = await verifyAccess({lnd, macaroon, permissions});

    strictSame(validity, {is_valid: true}, 'Macaroon is valid');

    const invalid = await verifyAccess({
      lnd,
      macaroon,
      permissions: ['address:write'],
    });

    strictSame(invalid, {is_valid: false}, 'Message is not valid');
  } catch (err) {
    strictSame(err, [501, 'VerifyAccessMethodNotSupported'], 'Got error')
  }

  kill();

  await waitForTermination({lnd});

  return end();
});
