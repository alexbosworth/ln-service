const {test} = require('@alexbosworth/tap');

const {authenticatedLndGrpc} = require('./../../');
const {getAccessIds} = require('./../../');
const {grantAccess} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const defaultId = '0';
const id = '1';

// Getting access ids should return root macaroon ids
test(`Get access ids`, async ({end, equal, rejects, strictSame}) => {
  const spawned = await spawnLnd({});

  const {lnd, kill} = spawned;

  await grantAccess({id, lnd, is_ok_to_create_chain_addresses: true});

  try {
    const {ids} = await getAccessIds({lnd});

    strictSame(ids, [defaultId, id], 'Got expected access ids');
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
