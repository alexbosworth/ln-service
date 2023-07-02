const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {getAutopilot} = require('./../../');
const {setAutopilot} = require('./../../');

const avg = array => array.reduce((a, b) => a + b) / array.length;
const confirmationCount = 6;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const maxScore = 1e8;
const score = 50000000;
const size = 2;

// Adjusting autopilot should result in changed autopilot status
test(`Autopilot`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const cluster = {control, target};

  const {lnd} = cluster.control;

  await setupChannel({lnd, generate: control.generate, to: cluster.target});

  strictEqual(
    (await getAutopilot({lnd})).is_enabled,
    false,
    'Autopilot starts off'
  );

  await Promise.all([
    cluster.control.generate({count: confirmationCount}),
    delay(3000),
    setAutopilot({lnd, is_enabled: true}),
  ]);

  await addPeer({
    lnd,
    public_key: cluster.target.id,
    socket: cluster.target.socket,
  });

  strictEqual(
    (await getAutopilot({lnd})).is_enabled,
    true,
    'Autopilot turned on'
  );

  await setAutopilot({lnd, is_enabled: false});

  strictEqual(
    (await getAutopilot({lnd})).is_enabled,
    false,
    'Autopilot turned off'
  );

  const pubKey = cluster.control.id;

  await setAutopilot({
    lnd,
    candidate_nodes: [{public_key: pubKey, score}],
    is_enabled: true,
  });

  const autopilot = await getAutopilot({lnd, node_scores: [pubKey]});

  strictEqual(autopilot.is_enabled, true, 'Autopilot was enable');

  const [node] = autopilot.nodes;

  strictEqual(node.local_preferential_score, maxScore, 'Local score');
  strictEqual(node.local_score, score, 'Local score is represented');
  strictEqual(node.preferential_score, maxScore, 'Global preferential score');
  strictEqual(node.public_key, pubKey, 'Candidate node public key');
  strictEqual(node.score, score, 'External score is represented');
  strictEqual(node.weighted_local_score, avg([maxScore, score]), 'Weight avg');
  strictEqual(node.weighted_score, avg([maxScore, score]), 'Norm Weight avg');

  await kill({});

  return;
});
