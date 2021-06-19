const {address} = require('bitcoinjs-lib');
const {test} = require('@alexbosworth/tap');

const {authenticatedLndGrpc} = require('./../../');
const {createChainAddress} = require('./../../');
const {delay} = require('./../macros');
const {grantAccess} = require('./../../');
const {restrictMacaroon} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const format = 'np2wpkh';
const ip = '127.0.0.1';
const p2shAddressVersion = 196;
const pkHashByteLength = 20;
const regtestBech32AddressHrp = 'bcrt';

// Restricting the macaroon credentials should result in access limitation
test(`Restricted macaroons restrict access`, async ({end, equal, rejects}) => {
  const spawned = await spawnLnd({});

  const {lnd, kill} = spawned;

  const cert = spawned.lnd_cert;
  const socket = spawned.lnd_socket;

  // A regular macaroon can create a chain address
  {
    const macaroon = spawned.lnd_macaroon;

    const {lnd} = authenticatedLndGrpc({cert, macaroon, socket});

    await createChainAddress({format, lnd});
  }

  // A macaroon that is ip limited to the wrong ip is rejected
  {
    const {macaroon} = restrictMacaroon({
      ip: '203.0.113.0',
      macaroon: spawned.lnd_macaroon,
    });

    const {lnd} = authenticatedLndGrpc({cert, macaroon, socket});

    rejects(
      createChainAddress({format, lnd}),
      [503, 'UnexpectedErrorCreatingAddress'],
      'Does not allow incorrect ip'
    );

    const addRestriction = restrictMacaroon({macaroon, ip: '127.0.0.1'});

    const addedLnd = authenticatedLndGrpc({
      cert,
      socket,
      macaroon: addRestriction.macaroon,
    });

    rejects(
      createChainAddress({format, lnd: addedLnd.lnd}),
      [503, 'UnexpectedErrorCreatingAddress'],
      'Does not allow extended ip'
    );
  }

  // A macaroon that is ip limited to the right ip is allowed
  {
    const {macaroon} = restrictMacaroon({
      ip: '127.0.0.1',
      macaroon: spawned.lnd_macaroon,
    });

    const {lnd} = authenticatedLndGrpc({cert, macaroon, socket});

    await createChainAddress({format, lnd});
  }

  // A macaroon that is time limited is allowed at first
  {
    const {macaroon} = restrictMacaroon({
      expires_at: new Date(Date.now() + 1000).toISOString(),
      macaroon: spawned.lnd_macaroon,
    });

    const {lnd} = authenticatedLndGrpc({cert, macaroon, socket});

    await createChainAddress({format, lnd});

    await delay(2000);

    // A macaroon that is expired is not allowed
    rejects(
      createChainAddress({format, lnd}),
      [503, 'UnexpectedErrorCreatingAddress'],
      'Does not allow expired macaroon'
    );

    const addTime = restrictMacaroon({
      macaroon,
      expires_at: new Date(Date.now() + 1000).toISOString(),
    });

    const addedLnd = authenticatedLndGrpc({
      cert,
      socket,
      macaroon: addTime.macaroon,
    });

    // Adding time is also not allowed
    rejects(
      createChainAddress({format, lnd: addedLnd.lnd}),
      [503, 'UnexpectedErrorCreatingAddress'],
      'Does not allow extending expired macaroon'
    );
  }

  kill();

  await waitForTermination({lnd});

  return end();
});
