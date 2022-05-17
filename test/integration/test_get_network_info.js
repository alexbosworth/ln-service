const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getNetworkInfo} = require('./../../');
const {setupChannel} = require('./../macros');

const size = 2;
const tokens = 1e6;

// Getting the network info should return basic network statistics
test(`Get network info`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await setupChannel({generate, lnd, to: target});

  const result = await getNetworkInfo({lnd});

  equal(result.average_channel_size, tokens, 'Average channel size');
  equal(result.channel_count, 1, 'Channel count');
  equal(result.max_channel_size, tokens, 'Maximum channel size');
  equal(result.median_channel_size, tokens, 'Median channel size');
  equal(result.min_channel_size, tokens, 'Minimum channel size');
  equal(result.not_recently_updated_policy_count, 0, 'Not updated count');
  equal(result.total_capacity, tokens, 'Total capacity');

  await kill({});

  return end();
});
