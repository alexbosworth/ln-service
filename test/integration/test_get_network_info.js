const {test} = require('@alexbosworth/tap');

const {getNetworkInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

// Getting the network info should return basic network statistics
test(`Get network info`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const result = await getNetworkInfo({lnd});

  equal(result.average_channel_size, 0, 'Average channel size');
  equal(result.channel_count, 0, 'Channel count');
  equal(result.max_channel_size, 0, 'Maximum channel size');
  equal(result.median_channel_size, 0, 'Median channel size');
  equal(result.min_channel_size, 0, 'Minimum channel size');
  equal(result.node_count, 1, 'Node count');
  equal(result.not_recently_updated_policy_count, 0, 'Not updated count');
  equal(result.total_capacity, 0, 'Total capacity');

  kill();

  await waitForTermination({lnd});

  return end();
});
