const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {ok} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getConfiguration} = require('./../../');
const {getWalletInfo} = require('./../../');

// Getting the configuration info should return info about the config
test(`Get configuration info`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  try {
    const {log, options} = await getConfiguration({lnd});

    ok(!!log.length, 'Got the log lines');

    const color = options.find(n => n.type === 'color').value.toLowerCase();

    equal(color, (await getWalletInfo({lnd})).color, 'Got color from config');

    await kill({});
  } catch (err) {
    await kill({});

    deepEqual(err, [501, 'GetDebugConfigurationInfoNotSupported'], '404');
  }

  return;
});
