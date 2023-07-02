const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getMethods} = require('./../../');

const {isArray} = Array;

// Getting LND methods should result in LND methods returned
test(`Get LND methods`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  const {methods} = await getMethods({lnd});

  const [method] = methods;

  strictEqual(typeof method.endpoint, 'string', 'Has endpoint path');
  strictEqual(isArray(method.permissions), true, 'Has array of permissions');

  const [permission] = method.permissions;

  strictEqual(typeof permission, 'string', 'Has permission');

  await kill({});

  return;
});
