const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const {getNetworkGraph} = require('./../../');
const {getAutopilot} = require('./../../');
const {openChannel} = require('./../../');
const {setAutopilot} = require('./../../');
const {setupChannel} = require('./../macros');
const {spawnLnd} = require('./../macros');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const avg = array => array.reduce((a, b) => a + b) / array.length;
const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const maxScore = 1e8;
const score = 50000000;

// Adjusting autopilot should result in changed autopilot status
test(`Autopilot`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {kill} = cluster;

  const {lnd} = cluster.control;

  await setupChannel({lnd, generate: cluster.generate, to: cluster.target});

  equal((await getAutopilot({lnd})).is_enabled, false, 'Autopilot starts off');

  await Promise.all([
    cluster.control.generate({count: confirmationCount}),
    delay(3000),
    setAutopilot({lnd, is_enabled: true}),
  ]);

  await addPeer({
    lnd,
    public_key: cluster.target.public_key,
    socket: cluster.target.socket,
  });

  equal((await getAutopilot({lnd})).is_enabled, true, 'Autopilot turned on');

  await setAutopilot({lnd, is_enabled: false});

  equal((await getAutopilot({lnd})).is_enabled, false, 'Autopilot turned off');

  const pubKey = cluster.control.public_key;

  await setAutopilot({
    lnd,
    candidate_nodes: [{public_key: pubKey, score}],
    is_enabled: true,
  });

  const autopilot = await getAutopilot({lnd, node_scores: [pubKey]});

  equal(autopilot.is_enabled, true, 'Autopilot was enable');

  const [node] = autopilot.nodes;

  equal(node.local_preferential_score, maxScore, 'Local preferential score');
  equal(node.local_score, score, 'Local score is represented');
  equal(node.preferential_score, maxScore, 'Global preferential score');
  equal(node.public_key, pubKey, 'Candidate node public key');
  equal(node.score, score, 'External score is represented');
  equal(node.weighted_local_score, avg([maxScore, score]), 'Weight averaged');
  equal(node.weighted_score, avg([maxScore, score]), 'Normal Weight average');

  await kill({});

  return end();
});
