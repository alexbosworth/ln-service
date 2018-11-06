const {test} = require('tap');

const {routeFromHops} = require('./../../routing');

const tests = [
  {
    args: {
      height: 144,
      hops: [
        {
          base_fee_mtokens: '1000',
          channel_id: '0',
          cltv_delta: 144,
          fee_rate: 1,
        },
        {
          base_fee_mtokens: '2000',
          channel_id: '1',
          cltv_delta: 144,
          fee_rate: 2,
        },
        {
          base_fee_mtokens: '3000',
          channel_id: '2',
          cltv_delta: 144,
          fee_rate: 3,
        },
      ],
      mtokens: '2000000000',
    },
    description: 'Sending across a node adds fees',
    expected: {
      fee: 9,
      fee_mtokens: '9000',
      hops: [
        {
          channel_capacity: 16777215,
          channel_id: '0',
          fee: 3,
          fee_mtokens: '3000',
          forward: 2000006,
          forward_mtokens: '2000006000',
          timeout: 432,
        },
        {
          channel_capacity: 16777215,
          channel_id: '1',
          fee: 6,
          fee_mtokens: '6000',
          forward: 2000000,
          forward_mtokens: '2000000000',
          timeout: 288,
        },
        {
          channel_capacity: 16777215,
          channel_id: '2',
          fee: 0,
          fee_mtokens: '0',
          forward: 2000000,
          forward_mtokens: '2000000000',
          timeout: 288,
        },
      ],
      mtokens: '2000009000',
      timeout: 576,
      tokens: 2000009,
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end}) => {
    const route = routeFromHops(args);

    deepIs(route, expected, 'Route is constructed as expected');

    return end();
  });
});

