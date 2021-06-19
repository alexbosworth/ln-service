const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {getNetworkCentrality} = require('./../../');
const {setupChannel} = require('./../macros');

const interval = 1e4;
const times = 100;

// Getting the network centrality should return the centrality scores
test(`Get network centrality`, async ({end, equal, strictSame}) => {
  const cluster = await createCluster({});

  await getNetworkCentrality({lnd: cluster.control.lnd});

  const {control} = cluster;
  const {remote} = cluster;
  const {target} = cluster;

  const {lnd} = control;

  await setupChannel({lnd, generate: cluster.generate, to: target});

  await setupChannel({
    generate: cluster.generate,
    generator: target,
    lnd: target.lnd,
    to: remote,
  });

  await asyncRetry({interval, times}, async () => {
    await addPeer({lnd, public_key: remote.public_key, socket: remote.socket});

    const {nodes} = await getNetworkCentrality({lnd});

    const controlScore = nodes.find(n => n.public_key === control.public_key);
    const remoteScore = nodes.find(n => n.public_key === remote.public_key);
    const targetScore = nodes.find(n => n.public_key === target.public_key);

    if (!targetScore.betweenness || !targetScore.betweenness_normalized) {
      throw new Error('UnexpectedValueForTargetScoreBetweenness');
    }

    if (targetScore.betweenness !== 1e6) {
      throw new Error('WrongBetweennessScore');
    }

    equal(controlScore.betweenness, 0, 'No centrality on control');
    equal(controlScore.betweenness_normalized, 0, 'No centrality on control');
    equal(remoteScore.betweenness, 0, 'No centrality on remote');
    equal(remoteScore.betweenness_normalized, 0, 'No centrality on remote');
    equal(targetScore.betweenness, 1e6, 'Centrality around target');
    equal(targetScore.betweenness_normalized, 1e6, 'Centrality around target');

    return;
  });

  await cluster.kill({});

  return end();
});
