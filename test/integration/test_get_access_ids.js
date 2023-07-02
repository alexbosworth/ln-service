const {deepStrictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getAccessIds} = require('./../../');
const {grantAccess} = require('./../../');

const defaultId = '0';
const id = '1';

// Getting access ids should return root macaroon ids
test(`Get access ids`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  await grantAccess({id, lnd, is_ok_to_create_chain_addresses: true});

  const {ids} = await getAccessIds({lnd});

  deepStrictEqual(ids, [defaultId, id], 'Got expected access ids');

  await kill({});

  return;
});
