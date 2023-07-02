const {equal} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getWalletVersion} = require('./../../');

const {isArray} = Array;

// Getting the wallet version should return the wallet version
test(`Get wallet version`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  try {
    const version = await getWalletVersion({lnd});

    equal(isArray(version.build_tags), true, 'Got array of build tags');
    equal(typeof version.commit_hash, 'string', 'Got commit hash string');
    equal(typeof version.is_autopilotrpc_enabled, 'boolean', 'Autopilotrpc');
    equal(typeof version.is_chainrpc_enabled, 'boolean', 'Got chainrpc');
    equal(typeof version.is_invoicesrpc_enabled, 'boolean', 'Got invoicesrpc');
    equal(typeof version.is_signrpc_enabled, 'boolean', 'Got signrpc');
    equal(typeof version.is_walletrpc_enabled, 'boolean', 'Got walletrpc');
    equal(typeof version.is_watchtowerrpc_enabled, 'boolean', 'Watchtowerrpc');
    equal(typeof version.is_wtclientrpc_enabled, 'boolean', 'Got wtclientrpc');
  } catch (err) {
    const [code, message] = err;

    equal(code, 501, 'Got unsupported error code');
    equal(message, 'VersionMethodUnsupported', 'Got unsupported error');
  }

  await kill({});

  return;
});
