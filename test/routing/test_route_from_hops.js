const {test} = require('tap');

const {routeFromHops} = require('./../../routing');

const tests = [
  {
    args: {
      cltv: 143,
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
      fee: 35,
      fee_mtokens: '35300',
      hops: [
        {
          channel: '598313545984638976',
          channel_capacity: 8429350,
          fee: 3,
          fee_mtokens: '3000',
          forward: 300032,
          forward_mtokens: '300032300',
          public_key: '03e50492eab4107a773141bb419e107bda3de3d55652e6e1a41225f06a0bbf2d56',
          timeout: 551038,
        },
        {
          channel: '603838592008716289',
          channel_capacity: 2000000,
          fee: 31,
          fee_mtokens: '31000',
          forward: 300001,
          forward_mtokens: '300001300',
          public_key: '03bb88ccc444534da7b5b64b4f7b15e1eccb18e102db0e400d4b9cfe93763aa26d',
          timeout: 550894,
        },
        {
          channel: '585344806272630785',
          channel_capacity: 400000,
          fee: 1,
          fee_mtokens: '1300',
          forward: 300000,
          forward_mtokens: '300000000',
          public_key: '028dcc199be86786818c8c32bffe9db8855c5fca98951eec99d1fa335d841605c2',
          timeout: 550750,
        },
        {
          channel: '605387803773239296',
          channel_capacity: 364355,
          fee: 0,
          fee_mtokens: '0',
          forward: 300000,
          forward_mtokens: '300000000',
          public_key: '03277a99c297a53859b42a9bb8cb2c5c17b9eaa44509bae150e2ea35ca5aa29bd9',
          timeout: 550750,
        },
      ],
      mtokens: '300035300',
      timeout: 551182,
      tokens: 300035,
    },
  },
  {
    args: {
      height: 144,
      hops: [
        {
          base_fee_mtokens: '1000',
          channel: '0',
          channel_capacity: 16777215,
          cltv_delta: 144,
          fee_rate: 1,
          public_key: 'b',
        },
        {
          base_fee_mtokens: '2000',
          channel: '1',
          channel_capacity: 16777215,
          cltv_delta: 144,
          fee_rate: 2,
          public_key: 'c',
        },
        {
          base_fee_mtokens: '3000',
          channel: '2',
          channel_capacity: 16777215,
          cltv_delta: 144,
          fee_rate: 3,
          public_key: 'd',
        },
      ],
      mtokens: '2000000000',
    },
    description: 'Sending across a node adds fees',
    expected: {
      fee: 15,
      fee_mtokens: '15000',
      hops: [
        {
          channel: '0',
          channel_capacity: 16777215,
          fee: 6,
          fee_mtokens: '6000',
          forward: 2000009,
          forward_mtokens: '2000009000',
          public_key: 'b',
          timeout: 432,
        },
        {
          channel: '1',
          channel_capacity: 16777215,
          fee: 9,
          fee_mtokens: '9000',
          forward: 2000000,
          forward_mtokens: '2000000000',
          public_key: 'c',
          timeout: 288,
        },
        {
          channel: '2',
          channel_capacity: 16777215,
          fee: 0,
          fee_mtokens: '0',
          forward: 2000000,
          forward_mtokens: '2000000000',
          public_key: 'd',
          timeout: 288,
        },
      ],
      mtokens: '2000015000',
      timeout: 576,
      tokens: 2000015,
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

