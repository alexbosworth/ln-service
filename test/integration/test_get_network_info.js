const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getNetworkInfo} = require('./../../');

// Getting the network info should return basic network statistics
test(`Get network info`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  const result = await getNetworkInfo({lnd});

  equal(result.average_channel_size, 0, 'Average channel size');
  equal(result.channel_count, 0, 'Channel count');
  equal(result.max_channel_size, 0, 'Maximum channel size');
  equal(result.median_channel_size, 0, 'Median channel size');
  equal(result.min_channel_size, 0, 'Minimum channel size');
  equal(result.not_recently_updated_policy_count, 0, 'Not updated count');
  equal(result.total_capacity, 0, 'Total capacity');

  await kill({});

  return end();
});
