const {address} = require('bitcoinjs-lib');
const {test} = require('tap');

const {authenticatedLndGrpc} = require('./../../');
const {createChainAddress} = require('./../../');
const {grantAccess} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const format = 'np2wpkh';
const p2shAddressVersion = 196;
const pkHashByteLength = 20;
const regtestBech32AddressHrp = 'bcrt';

// Granting access should result in access granted
test(`Get access credentials`, async ({end, equal, rejects}) => {
  const spawned = await spawnLnd({});

  const {lnd, kill} = spawned;

  try {
    await grantAccess({lnd, is_ok_to_create_chain_addresses: true});
  } catch (err) {
    const [, type] = err;

    // Avoid this test on LND 0.8.1 and below
    if (type === 'GrantAccessMethodNotSupported') {
      kill();

      await waitForTermination({lnd});

      return end();
    }
  }

  const makeChainAddresses = await grantAccess({
    lnd,
    is_ok_to_create_chain_addresses: true,
  });

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

  const err = [503, 'UnexpectedErrorCreatingAddress'];

  rejects(createChainAddress({format, lnd: canPay.lnd}), err, 'Fail access');

  const {address} = await createChainAddress({format, lnd: makeAddress.lnd});

  equal(!!address, true, 'Can make address with proper credential');

  kill();

  await waitForTermination({lnd});

  return end();
});
