const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getMethods} = require('./../../');

// Getting LND methods should result in LND methods returned
test(`Get LND methods`, async ({end, equal, type}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  try {
    const {methods} = await getMethods({lnd});

    const [method] = methods;

    type(method.endpoint, 'string', 'Has endpoint path');
    type(method.permissions, Array, 'Has array of permissions');

    const [permission] = method.permissions;

    type(permission, 'string', 'Has permission');
  } catch (err) {
    const [code, message] = err;

    equal(code, 501, 'Method not supported yet');
    equal(message, 'ListPermissionsMethodNotSupported', 'Not supported msg');
  }

  await kill({});

  return end();
});
