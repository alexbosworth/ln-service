const {test} = require('@alexbosworth/tap');

const {getWalletStatus} = require('./../../');
const {getWalletVersion} = require('./../../');
const {spawnLnd} = require('./../macros');
const {unauthenticatedLndGrpc} = require('./../../');
const {waitForTermination} = require('./../macros');

// Getting the wallet status should return info about its state
test(`Get wallet status`, async ({end, equal, strictSame}) => {
  const spawned = await spawnLnd({});

  const pubKey = spawned.public_key;

  const {lnd} = unauthenticatedLndGrpc({
    cert: spawned.lnd_cert,
    socket: `localhost:${spawned.rpc_port}`,
  });

  const {version} = await getWalletVersion({lnd: spawned.lnd});

  try {
    const result = await getWalletStatus({lnd});

    equal(result.is_active, true, 'Got expected state');
  } catch (err) {
    switch (version) {
    case '0.11.0-beta':
    case '0.11.1-beta':
    case '0.12.0-beta':
    case '0.12.1-beta':
      strictSame(err, [501, 'GetWalletStatusMethodUnsupported']);
      break;

    default:
      strictSame(err, null, 'No error is expected');
    }
  }

  spawned.kill({});

  await waitForTermination({lnd: spawned.lnd});

  return end();
});
