const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {connectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {getWalletInfo} = require('./../../');

const conf = ['--watchtower.active', '--wtclient.active'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const interval = 50;
const size = 2;
const times = 3000;

// Getting connected watchtowers should return watchtowers
test(`Get connected watchtowers`, async () => {
  const {kill, nodes} = await spawnLightningCluster({
    size,
    lnd_configuration: conf
  });

  const [{generate, lnd}, target] = nodes;

  await asyncRetry({interval, times}, async () => {
    const wallet = await getWalletInfo({lnd});

    await generate({});

    if (!wallet.is_synced_to_chain) {
      throw new Error('NotSyncedToChain');
    }
  });

  try {
    const {tower} = await getTowerServerInfo({lnd: target.lnd});

    const [socket] = tower.sockets;

    // LND 0.19.0 requires a wait before connecting
    await delay(5000);

    await connectWatchtower({lnd, socket, public_key: tower.public_key});

    const res = (await getConnectedWatchtowers({lnd}));

    const [watcher] = res.towers;

    equal(res.backups_count, 0, 'Got backups count');
    equal(res.failed_backups_count, 0, 'Got failed backups count');
    equal(res.finished_sessions_count, 0, 'Got finished sessions count');
    equal(res.max_session_update_count, 1024, 'Got max session update count');
    equal(res.pending_backups_count, 0, 'Got pending backups count');
    equal(res.sessions_count, 0, 'Got sessions count');
    equal(res.sweep_tokens_per_vbyte, 10, 'Got sweep tokens per vbyte');

    equal(watcher.is_active, true, 'Tower is active');
    equal(watcher.public_key, tower.public_key, 'Tower is connected');
    equal(watcher.sessions.length, [].length, 'No sessions initiated');
    equal(watcher.sockets.slice().pop(), socket, 'Tower socket returned');
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
