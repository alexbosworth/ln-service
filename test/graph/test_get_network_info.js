const {test} = require('@alexbosworth/tap');

const {getNetworkInfo} = require('./../../lightning');

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndForNetworkInfoRequest'],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk('Error')}}},
    description: 'Unexpected error returned',
    error: [503, 'UnexpectedGetNetworkInfoError', {err: 'Error'}],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk(null, {})}}},
    description: 'Average channel size returned',
    error: [503, 'ExpectedAvgChannelSize'],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk(null, {
      avg_channel_size: 1,
    })}}},
    description: 'Max channel size returned',
    error: [503, 'ExpectedMaxChannelSize'],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk(null, {
      avg_channel_size: 1,
      max_channel_size: '1',
    })}}},
    description: 'Median channel size returned',
    error: [503, 'ExpectedMedianChannelSizeInNetworkInfo'],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk(null, {
      avg_channel_size: 1,
      max_channel_size: '1',
      median_channel_size_sat: '1',
    })}}},
    description: 'Min channel size returned',
    error: [503, 'ExpectedMinChannelSize'],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk(null, {
      avg_channel_size: 1,
      max_channel_size: '1',
      median_channel_size_sat: '1',
      min_channel_size: '1',
    })}}},
    description: 'Number of channels returned',
    error: [503, 'ExpectedNumChannels'],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk(null, {
      avg_channel_size: 1,
      max_channel_size: '1',
      median_channel_size_sat: '1',
      min_channel_size: '1',
      num_channels: 1,
    })}}},
    description: 'Number of nodes returned',
    error: [503, 'ExpectedNumNodes'],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk(null, {
      avg_channel_size: 1,
      max_channel_size: '1',
      median_channel_size_sat: '1',
      min_channel_size: '1',
      num_channels: 1,
      num_nodes: 1,
    })}}},
    description: 'Zombie channels returned',
    error: [503, 'ExpectedNumberOfZombieChannelsInNetworkInfo'],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk(null, {
      avg_channel_size: 1,
      max_channel_size: '1',
      median_channel_size_sat: '1',
      min_channel_size: '1',
      num_channels: 1,
      num_nodes: 1,
      num_zombie_chans: '1',
    })}}},
    description: 'Total network capacity returned',
    error: [503, 'ExpectedTotalNetworkCapacity'],
  },
  {
    args: {lnd: {default: {getNetworkInfo: ({}, cbk) => cbk(null, {
      avg_channel_size: 1,
      max_channel_size: '1',
      median_channel_size_sat: '1',
      min_channel_size: '1',
      num_channels: 1,
      num_nodes: 1,
      num_zombie_chans: '1',
      total_network_capacity: '1',
    })}}},
    description: 'Network info returned',
    expected: {
      average_channel_size: 1,
      channel_count: 1,
      max_channel_size: 1,
      median_channel_size: 1,
      min_channel_size: 1,
      node_count: 1,
      not_recently_updated_policy_count: 1,
      total_capacity: 1,
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getNetworkInfo(args), error, 'Got expected error');
    } else {
      const networkInfo = await getNetworkInfo(args);

      deepEqual(networkInfo, expected, 'Got expected network info');
    }

    return end();
  });
});
