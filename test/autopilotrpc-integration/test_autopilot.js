const {readFileSync} = require('fs');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const {getNetworkGraph} = require('./../../');
const {getWalletInfo} = require('./../../');
const {getAutopilot} = require('./../../');
const {openChannel} = require('./../../');
const {setAutopilot} = require('./../../');
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
  const cluster = await createCluster({});

  const {kill} = cluster;

  const controlToTargetChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.control.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({
    id: controlToTargetChannel.transaction_id,
    lnd: cluster.control.lnd,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  await waitForChannel({
    id: controlToTargetChannel.transaction_id,
    lnd: cluster.control.lnd,
  });

  const {lnd} = cluster.control;

  equal((await getAutopilot({lnd})).is_enabled, false, 'Autopilot starts off');

  await Promise.all([
    generateBlocks({
      cert: readFileSync(cluster.control.chain_rpc_cert),
      count: confirmationCount,
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
