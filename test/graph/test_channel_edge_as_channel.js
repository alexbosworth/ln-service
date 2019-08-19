const {test} = require('tap');

const {channelEdgeAsChannel} = require('./../../graph');

const tests = [
  {
    args: {
      capacity: '1',
      chan_point: `${Buffer.alloc(32).toString('hex')}:0`,
      channel_id: '000000000',
      last_update: 1,
      node1_policy: {
        disabled: true,
        fee_base_msat: '1',
        fee_rate_milli_msat: '1',
        max_htlc_msat: '1',
        min_htlc: '1',
        time_lock_delta: 1,
      },
      node1_pub: Buffer.alloc(33).toString('hex'),
      node2_policy: {
        disabled: false,
        fee_base_msat: '2',
        fee_rate_milli_msat: '2',
        max_htlc_msat: '2',
        min_htlc: '2',
        time_lock_delta: 2,
      },
      node2_pub: Buffer.alloc(33, 1).toString('hex'),
    },
    description: 'Channel edge cast as channel details',
    expected: {
      capacity: 1,
      id: '0x0x0',
      policies: [
        {
          base_fee_mtokens: '1',
          cltv_delta: 1,
          fee_rate: 1,
          is_disabled: true,
          max_htlc_mtokens: '1',
          min_htlc_mtokens: '1',
          public_key: Buffer.alloc(33).toString('hex'),
        },
        {
          base_fee_mtokens: '2',
          cltv_delta: 2,
          fee_rate: 2,
          is_disabled: false,
          max_htlc_mtokens: '2',
          min_htlc_mtokens: '2',
          public_key: Buffer.alloc(33, 1).toString('hex'),
        },
      ],
      transaction_id: Buffer.alloc(32).toString('hex'),
      transaction_vout: 0,
      updated_at: new Date(1000).toISOString(),
    },
  },
  {
    args: {},
    description: 'Capacity is required',
    error: 'ExpectedChannelCapacityInChannelEdgeResponse',
  },
  {
    args: {capacity: '0'},
    description: 'Channel point is required',
    error: 'ExpectedChannelOutpointInChannelEdgeResponse',
  },
  {
    args: {capacity: '0', chan_point: '01:1'},
    description: 'Channel id is required',
    error: 'ExpectedChannelIdInChannelEdgeResponse',
  },
  {
    args: {capacity: '0', chan_point: '01:1', channel_id: 'foo'},
    description: 'Numeric channel id is required',
    error: 'ExpectedNumericFormatChannelIdInChannelEdgeResponse',
  },
  {
    args: {capacity: '0', chan_point: '01:1', channel_id: '11'},
    description: 'Channel last update is required',
    error: 'ExpectedChannelLastUpdate',
  },
  {
    args: {capacity: '0', chan_point: '01:1', channel_id: '1', last_update: 1},
    description: 'Channel node 1 is required',
    error: 'ExpectedChannelNode1PublicKey',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepEqual, end, equal, throws}) => {
    if (!!error) {
      throws(() => channelEdgeAsChannel(args), new Error(error), 'Got error');
    } else {
      const channel = channelEdgeAsChannel(args);

      channel.policies.forEach(n => delete n.updated_at);

      deepEqual(channel, expected, 'Channel cast as channel');
    }

    return end();
  });
});
