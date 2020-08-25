const {test} = require('tap');

const {authenticatedLndGrpc} = require('./../../');
const {getAccessIds} = require('./../../');
const {grantAccess} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const defaultId = '0';
const id = '1';

// Getting access ids should return root macaroon ids
test(`Get access ids`, async ({deepIs, end, equal, rejects}) => {
  const spawned = await spawnLnd({});

  const {lnd, kill} = spawned;

  try {
    await grantAccess({id, lnd, is_ok_to_create_chain_addresses: true});
  } catch (err) {
    const [, type] = err;

    // Avoid this test on LND 0.8.2 and below
    if (type === 'GrantAccessMethodNotSupported') {
      kill();

      await waitForTermination({lnd});

      return end();
    }
  }

  try {
    const {ids} = await getAccessIds({lnd});

    deepIs(ids, [defaultId, id], 'Got expected access ids');
  } catch (err) {
    const [, type] = err;

    // Ignore failures on LND 0.11.0 and below
    if (type !== 'ListRootMacaroonIdsMethodNotSupported') {
      throw err;
    }
  }

  kill();

  await waitForTermination({lnd});

  return end();
});
