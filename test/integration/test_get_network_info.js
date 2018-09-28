const {test} = require('tap');

const getNetworkInfo = require('./../../getNetworkInfo');
const {spawnLnd} = require('./../macros');

// Getting the network info should return basic network statistics
test(`Get network info`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const result = await getNetworkInfo({lnd});

  equal(result.average_channel_size, 0, 'Average channel size');
  equal(result.channel_count, 0, 'Channel count');
  equal(result.maximum_channel_size, 0, 'Maximum channel size');
  equal(result.minimum_channel_size, 0, 'Minimum channel size');
  equal(result.node_count, 1, 'Node count');
  equal(result.total_capacity, 0, 'Total capacity');
  equal(result.type, 'network_info');

  kill();

  return end();
});

