const {test} = require('@alexbosworth/tap');

const {getMethods} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

// Getting LND methods should result in LND methods returned
test(`Get LND methods`, async ({end, equal, type}) => {
  const node = await spawnLnd({});

  const {kill, lnd} = node;

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

  kill();

  await waitForTermination({lnd});

  return end();
});
