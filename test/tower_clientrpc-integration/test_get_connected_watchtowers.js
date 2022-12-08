const {connectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const conf = ['--watchtower.active', '--wtclient.active'];
const size = 2;

// Getting connected watchtowers should return watchtowers
test(`Get connected watchtowers`, async ({end, equal, fail, match}) => {
  const {kill, nodes} = await spawnLightningCluster({
    size,
    lnd_configuration: conf
  });

  const [{lnd}, target] = nodes;

  try {
    const {tower} = await getTowerServerInfo({lnd: target.lnd});

    const [socket] = tower.sockets;

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

  return end();
});
