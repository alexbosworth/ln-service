const {address} = require('bitcoinjs-lib');
const {test} = require('@alexbosworth/tap');

const {authenticatedLndGrpc} = require('./../../');
const {createChainAddress} = require('./../../');
const {grantAccess} = require('./../../');
const {revokeAccess} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const format = 'np2wpkh';
const id = '1';
const p2shAddressVersion = 196;
const pkHashByteLength = 20;
const regtestBech32AddressHrp = 'bcrt';

// Revoking access should result in access denied
test(`Revoke access credentials`, async ({end, equal, rejects}) => {
  const spawned = await spawnLnd({});

  const {lnd, kill} = spawned;

  await grantAccess({lnd, is_ok_to_create_chain_addresses: true});

  const makeChainAddresses = await grantAccess({
    id,
    lnd,
    is_ok_to_create_chain_addresses: true,
    permissions: ['address:read'],
  });

  try {
    await revokeAccess({id, lnd});
  } catch (err) {
    const [, type] = err;

    // Avoid this test on LND 0.11.0 and below
    if (type === 'RevokeAccessMethodNotSupported') {
      kill();

      await waitForTermination({lnd});

      return end();
    }
  }

  const macLnd = authenticatedLndGrpc({
    cert: spawned.lnd_cert,
    macaroon: makeChainAddresses.macaroon,
    socket: spawned.lnd_socket,
  });

  const err = [503, 'UnexpectedErrorCreatingAddress'];

  await rejects(createChainAddress({format, lnd: macLnd.lnd}), err, 'Fails');

  kill();

  await waitForTermination({lnd});

  return end();
});
