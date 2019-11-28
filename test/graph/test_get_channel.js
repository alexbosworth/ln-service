const {test} = require('tap');

const {getChannel} = require('./../../');

const tests = [
  {
    args: {},
    description: 'An id for a channel is required',
    error: [400, 'ExpectedValidChannelIdToGetChannel'],
  },
  {
    args: {id: 'id'},
    description: 'LND is required to get the channel',
    error: [400, 'ExpectedLndToGetChannelDetails'],
  },
  {
    args: {
      id: 'id',
      lnd: {
        default: {
          getChanInfo: ({}, cbk) => cbk({details: 'edge marked as zombie'}),
        },
      },
    },
    description: 'Edge zombie failures are returned',
    error: [404, 'FullChannelDetailsNotFound'],
  },
  {
    args: {
      id: 'id',
      lnd: {
        default: {getChanInfo: ({}, cbk) => cbk({details: 'edge not found'})}
      },
    },
    description: 'Edge lookup failures are returned',
    error: [404, 'FullChannelDetailsNotFound'],
  },
  {
    args: {id: 'id', lnd: {default: {getChanInfo: ({}, cbk) => cbk('err')}}},
    description: 'Get channel errors are passed back from LND',
    error: [503, 'UnexpectedGetChannelInfoError', {err: 'err'}],
  },
  {
    args: {id: 'id', lnd: {default: {getChanInfo: ({}, cbk) => cbk()}}},
    description: 'A channel response is expected',
    error: [503, 'ExpectedGetChannelResponse'],
  },
  {
    args: {
      id: 'id',
      lnd: {
        default: {
          getChanInfo: ({}, cbk) => {
            return cbk(null, {
              chan_point: `${Buffer.alloc(32).toString('hex')}:0`,
              channel_id: '000000000',
              node1_policy: {
                disabled: true,
                fee_base_msat: '1',
                fee_rate_milli_msat: '1',
                last_update: 1,
                max_htlc_msat: '1',
                min_htlc: '1',
                time_lock_delta: 1,
              },
              node1_pub: Buffer.alloc(33).toString('hex'),
              node2_policy: {
                disabled: false,
                fee_base_msat: '2',
                fee_rate_milli_msat: '2',
                last_update: 1,
                max_htlc_msat: '2',
                min_htlc: '2',
                time_lock_delta: 2,
              },
              node2_pub: Buffer.alloc(33, 1).toString('hex'),
            });
          },
        },
      },
    },
    description: 'A valid channel is expected',
    error: [503, 'ExpectedChannelCapacityInChannelEdgeResponse'],
  },
  {
    args: {
      id: 'id',
      lnd: {
        default: {
          getChanInfo: ({}, cbk) => {
            return cbk(null, {
              capacity: '1',
              chan_point: `${Buffer.alloc(32).toString('hex')}:0`,
              channel_id: '000000000',
              node1_policy: {
                disabled: true,
                fee_base_msat: '1',
                fee_rate_milli_msat: '1',
                last_update: 1,
                max_htlc_msat: '1',
                min_htlc: '1',
                time_lock_delta: 1,
              },
              node1_pub: Buffer.alloc(33).toString('hex'),
              node2_policy: {
                disabled: false,
                fee_base_msat: '2',
                fee_rate_milli_msat: '2',
                last_update: 1,
                max_htlc_msat: '2',
                min_htlc: '2',
                time_lock_delta: 2,
              },
              node2_pub: Buffer.alloc(33, 1).toString('hex'),
            });
          },
        },
      },
    },
    description: 'Gets graph channel details',
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
          updated_at: new Date(1000).toISOString(),
        },
        {
          base_fee_mtokens: '2',
          cltv_delta: 2,
          fee_rate: 2,
          is_disabled: false,
          max_htlc_mtokens: '2',
          min_htlc_mtokens: '2',
          public_key: Buffer.alloc(33, 1).toString('hex'),
          updated_at: new Date(1000).toISOString(),
        },
      ],
      transaction_id: Buffer.alloc(32).toString('hex'),
      transaction_vout: 0,
      updated_at: new Date(1000).toISOString(),
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getChannel(args), error, 'Got expected error');
    } else {
      deepEqual(await getChannel(args), expected, 'Got expected channel');
    }

    return end();
  });
});
