const {test} = require('@alexbosworth/tap');

const {connectWatchtower} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {disconnectWatchtower} = require('./../../');
const {getConnectedWatchtowers} = require('./../../');
const {getTowerServerInfo} = require('./../../');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {spawnLnd} = require('./../macros');
const {stopDaemon} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');
const {waitForTermination} = require('./../macros');

// Getting connected watchtowers should return watchtowers
test(`Connect watchtower`, async ({end, equal, match}) => {
  let control;
  let tower;

  control = await spawnLnd({watchers: true});
  tower = await spawnLnd({tower: true});

  const info = (await getTowerServerInfo({lnd: tower.lnd})).tower;
  const {lnd} = control;

  const [socket] = info.sockets;

  await connectWatchtower({lnd, socket, public_key: info.public_key});

  const res = (await getConnectedWatchtowers({lnd}));

  equal(res.backups_count, 0, 'Got backups count');
  equal(res.failed_backups_count, 0, 'Got failed backups count');
  equal(res.finished_sessions_count, 0, 'Got finished sessions count');
  equal(res.max_session_update_count, 1024, 'Got max session update count');
  equal(res.pending_backups_count, 0, 'Got pending backups count');
  equal(res.sessions_count, 0, 'Got sessions count');
  equal(res.sweep_tokens_per_vbyte, 10, 'Got sweep tokens per vbyte');

  const [watcher] = res.towers;

  equal(watcher.is_active, true, 'Tower is active');
  equal(watcher.public_key, info.public_key, 'Tower is connected');
  equal(watcher.sessions.length, [].length, 'No sessions initiated');
  equal(watcher.sockets.slice().pop(), socket, 'Tower socket returned');

  [control, tower].forEach(n => n.kill());

  await waitForTermination({lnd});
  await waitForTermination({lnd: tower.lnd});

  return end();
});
