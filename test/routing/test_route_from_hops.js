const {test} = require('tap');

const {routeFromHops} = require('./../../routing');

const tests = [
  {
    args: {
      height: 550607,
      hops: [
        {
          base_fee_mtokens: '1000',
          channel: '598313545984638976',
          channel_capacity: 8429350,
          cltv_delta: 144,
          fee_rate: 2500,
          public_key: '03e50492eab4107a773141bb419e107bda3de3d55652e6e1a41225f06a0bbf2d56',
        },
        {
          base_fee_mtokens: '0',
          channel: '603838592008716289',
          channel_capacity: 2000000,
          cltv_delta: 144,
          fee_rate: 10,
          public_key: '03bb88ccc444534da7b5b64b4f7b15e1eccb18e102db0e400d4b9cfe93763aa26d',
        },
        {
          base_fee_mtokens: '1000',
          channel: '585344806272630785',
          channel_capacity: 400000,
          cltv_delta: 144,
          fee_rate: 100,
          public_key: '028dcc199be86786818c8c32bffe9db8855c5fca98951eec99d1fa335d841605c2',
        },
        {
          base_fee_mtokens: '1000',
          channel: '605387803773239296',
          channel_capacity: 364355,
          cltv_delta: 144,
          fee_rate: 1,
          public_key: '03277a99c297a53859b42a9bb8cb2c5c17b9eaa44509bae150e2ea35ca5aa29bd9',
        },
      ],
      mtokens: '300000000',
    },
    description: 'Sending across multiple nodes',
    expected: {
      fee: 785,
      fee_mtokens: '785085',
      hops: [
        {
          channel: '598313545984638976',
          channel_capacity: 8429350,
          fee: 751,
          fee_mtokens: '751085',
          forward: 300034,
          forward_mtokens: '300034000',
          public_key: '03e50492eab4107a773141bb419e107bda3de3d55652e6e1a41225f06a0bbf2d56',
          timeout: 551039,
        },
        {
          channel: '603838592008716289',
          channel_capacity: 2000000,
          fee: 3,
          fee_mtokens: '3000',
          forward: 300031,
          forward_mtokens: '300031000',
          public_key: '03bb88ccc444534da7b5b64b4f7b15e1eccb18e102db0e400d4b9cfe93763aa26d',
          timeout: 550895,
        },
        {
          channel: '585344806272630785',
          channel_capacity: 400000,
          fee: 31,
          fee_mtokens: '31000',
          forward: 300000,
          forward_mtokens: '300000000',
          public_key: '028dcc199be86786818c8c32bffe9db8855c5fca98951eec99d1fa335d841605c2',
          timeout: 550751,
        },
        {
          channel: '605387803773239296',
          channel_capacity: 364355,
          fee: 0,
          fee_mtokens: '0',
          forward: 300000,
          forward_mtokens: '300000000',
          public_key: '03277a99c297a53859b42a9bb8cb2c5c17b9eaa44509bae150e2ea35ca5aa29bd9',
          timeout: 550751,
        },
      ],
      mtokens: '300785085',
      timeout: 551183,
      tokens: 300785,
    },
  },
  {
    args: {
      height: 144,
      hops: [
        {
          base_fee_mtokens: '1000',
          channel: '0',
          cltv_delta: 144,
          fee_rate: 1,
        },
        {
          base_fee_mtokens: '2000',
          channel: '1',
          cltv_delta: 144,
          fee_rate: 2,
        },
        {
          base_fee_mtokens: '3000',
          channel: '2',
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
          channel: '0',
          channel_capacity: 16777215,
          fee: 3,
          fee_mtokens: '3000',
          forward: 2000006,
          forward_mtokens: '2000006000',
          public_key: undefined,
          timeout: 432,
        },
        {
          channel: '1',
          channel_capacity: 16777215,
          fee: 6,
          fee_mtokens: '6000',
          forward: 2000000,
          forward_mtokens: '2000000000',
          public_key: undefined,
          timeout: 288,
        },
        {
          channel: '2',
          channel_capacity: 16777215,
          fee: 0,
          fee_mtokens: '0',
          forward: 2000000,
          forward_mtokens: '2000000000',
          public_key: undefined,
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

