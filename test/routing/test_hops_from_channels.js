const {test} = require('tap');

const {hopsFromChannels} = require('./../../routing');

const tests = [
  {
    args: {
      channels: [
        {
          capacity: 1000,
          id: '0',
          policies: [
            {
              base_fee_mtokens: '9999',
              cltv_delta: 999,
              fee_rate: 9,
              public_key: 'alice',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 1,
              public_key: 'origin',
            },
          ],
        },
        {
          capacity: 2000,
          id: '1',
          policies: [
            {
              base_fee_mtokens: '9999',
              cltv_delta: 999,
              fee_rate: 9,
              public_key: 'alice',
            },
            {
              base_fee_mtokens: '2000',
              cltv_delta: 144,
              fee_rate: 2,
              public_key: 'bob',
            },
          ],
        },
        {
          capacity: 3000,
          id: '2',
          policies: [
            {
              base_fee_mtokens: '3000',
              cltv_delta: 144,
              fee_rate: 3,
              public_key: 'charlie',
            },
            {
              base_fee_mtokens: '9999',
              cltv_delta: 999,
              fee_rate: 9,
              public_key: 'bob',
            },
          ],
        },
      ],
      destination: 'charlie',
    },
    description: 'Mapping channels to hops results in a hops list',
    expected: [
      {
        base_fee_mtokens: '1000',
        channel_capacity: 1000,
        channel_id: '0',
        cltv_delta: 144,
        fee_rate: 1,
      },
      {
        base_fee_mtokens: '2000',
        channel_capacity: 2000,
        channel_id: '1',
        cltv_delta: 144,
        fee_rate: 2,
      },
      {
        base_fee_mtokens: '3000',
        channel_capacity: 3000,
        channel_id: '2',
        cltv_delta: 144,
        fee_rate: 3,
      },
    ],
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end}) => {
    const {hops} = hopsFromChannels(args);

    deepIs(hops, expected, 'Hops returned as expected');

    return end();
  });
});

