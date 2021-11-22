const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getAccessIds} = require('./../../');
const {grantAccess} = require('./../../');
const {spawnLnd} = require('./../macros');

const defaultId = '0';
const id = '1';

// Getting access ids should return root macaroon ids
test(`Get access ids`, async ({end, equal, rejects, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

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

  await kill({});

  return end();
});
