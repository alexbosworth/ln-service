const {readFileSync} = require('fs');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const createChainAddress = require('./../../createChainAddress');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const getNetworkGraph = require('./../../getNetworkGraph');
const getWalletInfo = require('./../../getWalletInfo');
const getAutopilot = require('./../../getAutopilot');
const openChannel = require('./../../openChannel');
const setAutopilot = require('./../../setAutopilot');
const {spawnLnd} = require('./../macros');

const avg = array => array.reduce((a, b) => a + b) / array.length;
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const maxScore = 1e8;
const score = 50000000;

// Adjusting autopilot should result in changed autopilot status
test(`Autopilot`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {kill} = cluster;

  await delay(2000);

  const controlToTargetChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.control.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await delay(4000);

  await cluster.generate({count: confirmationCount, node: cluster.control});

  await delay(4000);

  const lnd = cluster.control.autopilot_lnd;

  equal((await getAutopilot({lnd})).is_enabled, false, 'Autopilot starts off');

  await Promise.all([
    generateBlocks({
      cert: readFileSync(cluster.control.chain_rpc_cert),
      count: 6,
      host: cluster.control.listen_ip,
      pass: cluster.control.chain_rpc_pass,
      port: cluster.control.chain_rpc_port,
      user: cluster.control.chain_rpc_user,
    }),
    delay(3000),
    setAutopilot({lnd, is_enabled: true}),
  ]);

  await addPeer({
    lnd: cluster.control.lnd,
    public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  equal((await getAutopilot({lnd})).is_enabled, true, 'Autopilot turned on');

  await setAutopilot({lnd, is_enabled: false});

  equal((await getAutopilot({lnd})).is_enabled, false, 'Autopilot turned off');

  const pubKey = (await getWalletInfo({lnd: cluster.control.lnd})).public_key;

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
