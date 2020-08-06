const {test} = require('tap');

const {routeFromHops} = require('./../../routing');

const tests = [
  {
    args: {
      height: 590318,
      hops: [
        {
          base_fee_mtokens: '1000',
          channel: '0',
          channel_capacity: 16777215,
          cltv_delta: 40,
          fee_rate: 2500,
          public_key: 'b',
        },
        {
          base_fee_mtokens: '1000',
          channel: '1',
          channel_capacity: 16777215,
          cltv_delta: 30,
          fee_rate: 2500,
          public_key: 'c',
        },
        {
          base_fee_mtokens: '0',
          channel: '2',
          channel_capacity: 16777215,
          cltv_delta: 144,
          fee_rate: 1,
          public_key: 'd',
        },
        {
          base_fee_mtokens: '100',
          channel: '3',
          channel_capacity: 16777215,
          cltv_delta: 144,
          fee_rate: 1,
          public_key: 'e',
        },
      ],
      initial_cltv: 40,
      mtokens: '1000000',
    },
    description: 'Varying fee rates returns computed fees',
    expected: {
      fee: 3,
      fee_mtokens: '3602',
      hops: [
        {
          channel: '0',
          channel_capacity: 16777215,
          fee: 3,
          fee_mtokens: '3500',
          forward: 1000,
          forward_mtokens: '1000102',
          public_key: 'b',
          timeout: 590532,
        },
        {
          channel: '1',
          channel_capacity: 16777215,
          fee: 0,
          fee_mtokens: '1',
          forward: 1000,
          forward_mtokens: '1000101',
          public_key: 'c',
          timeout: 590502,
        },
        {
          channel: '2',
          channel_capacity: 16777215,
          fee: 0,
          fee_mtokens: '101',
          forward: 1000,
          forward_mtokens: '1000000',
          public_key: 'd',
          timeout: 590358,
        },
        {
          channel: '3',
          channel_capacity: 16777215,
          fee: 0,
          fee_mtokens: '0',
          forward: 1000,
          forward_mtokens: '1000000',
          public_key: 'e',
          timeout: 590358,
        },
      ],
      messages: undefined,
      mtokens: '1003602',
      timeout: 590572,
      tokens: 1003,
    },
  },
  {
    args: {
      cltv_delta: 143,
      height: 550607,
      hops: [
        {
          base_fee_mtokens: '1000',
          channel: '598313545984638976',
          channel_capacity: 8429350,
          cltv_delta: 144,
          fee_rate: 2500,
          public_key: 'b',
        },
        {
          base_fee_mtokens: '0',
          channel: '603838592008716289',
          channel_capacity: 2000000,
          cltv_delta: 144,
          fee_rate: 10,
          public_key: 'c',
        },
        {
          base_fee_mtokens: '1000',
          channel: '585344806272630785',
          channel_capacity: 400000,
          cltv_delta: 144,
          fee_rate: 100,
          public_key: 'd',
        },
        {
          base_fee_mtokens: '1000',
          channel: '605387803773239296',
          channel_capacity: 364355,
          cltv_delta: 144,
          fee_rate: 1,
          public_key: 'e',
        },
      ],
      initial_cltv: 144,
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
          public_key: 'b',
          timeout: 551038,
        },
        {
          channel: '603838592008716289',
          channel_capacity: 2000000,
          fee: 31,
          fee_mtokens: '31000',
          forward: 300001,
          forward_mtokens: '300001300',
          public_key: 'c',
          timeout: 550894,
        },
        {
          channel: '585344806272630785',
          channel_capacity: 400000,
          fee: 1,
          fee_mtokens: '1300',
          forward: 300000,
          forward_mtokens: '300000000',
          public_key: 'd',
          timeout: 550750,
        },
        {
          channel: '605387803773239296',
          channel_capacity: 364355,
          fee: 0,
          fee_mtokens: '0',
          forward: 300000,
          forward_mtokens: '300000000',
          public_key: 'e',
          timeout: 550750,
        },
      ],
      messages: undefined,
      mtokens: '300035300',
      timeout: 551182,
      tokens: 300035,
    },
  },
  {
    args: {
      height: 40,
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
      initial_cltv: 144,
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
          timeout: 224,
        },
        {
          channel: '1',
          channel_capacity: 16777215,
          fee: 9,
          fee_mtokens: '9000',
          forward: 2000000,
          forward_mtokens: '2000000000',
          public_key: 'c',
          timeout: 80,
        },
        {
          channel: '2',
          channel_capacity: 16777215,
          fee: 0,
          fee_mtokens: '0',
          forward: 2000000,
          forward_mtokens: '2000000000',
          public_key: 'd',
          timeout: 80,
        },
      ],
      messages: undefined,
      mtokens: '2000015000',
      timeout: 368,
      tokens: 2000015,
    },
  },
  {
    args: {},
    description: 'The current height is required',
    error: 'ExpectedChainHeightForRoute',
  },
  {
    args: {height: 1},
    description: 'Hops array is required',
    error: 'ExpectedHopsToConstructRouteFrom',
  },
  {
    args: {height: 1, hops: []},
    description: 'Hops are required',
    error: 'ExpectedHopsToConstructRouteFrom',
  },
  {
    args: {height: 1, hops: [{}]},
    description: 'Initial cltv is required',
    error: 'ExpectedInitialCltvDeltaToConstructRouteFromHops',
  },
  {
    args: {height: 1, hops: [{}], initial_cltv: 1},
    description: 'Millitokens to route is required',
    error: 'ExpectedMillitokensToSendAcrossHops',
  },
  {
    args: {height: 1, hops: [{}], initial_cltv: 1, mtokens: '1'},
    description: 'Hops must have a base fee',
    error: 'ExpectedHopBaseFeeMillitokensForRouteConstruction',
  },
  {
    args: {
      height: 1,
      hops: [{base_fee_mtokens: '1'}],
      initial_cltv: 1,
      mtokens: '1',
    },
    description: 'Hops must have a channel id',
    error: 'ExpectedHopChannelIdForRouteConstruction',
  },
  {
    args: {
      height: 1,
      hops: [{base_fee_mtokens: '1', channel: '1x1x1'}],
      initial_cltv: 1,
      mtokens: '1',
    },
    description: 'Hops must have a cltv delta',
    error: 'ExpectedHopCltvForRouteConstruction',
  },
  {
    args: {
      height: 1,
      hops: [{base_fee_mtokens: '1', channel: '1x1x1', cltv_delta: 1}],
      initial_cltv: 1,
      mtokens: '1',
    },
    description: 'Hops must have a fee rate',
    error: 'ExpectedHopFeeRateForRouteConstruction',
  },
  {
    args: {
      height: 1,
      hops: [{
        base_fee_mtokens: '1',
        channel: '1x1x1',
        cltv_delta: 1,
        fee_rate: 1,
      }],
      initial_cltv: 1,
      mtokens: '1',
    },
    description: 'Hops must have a next node public key',
    error: 'ExpectedHopNextPublicKeyForRouteConstruction',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => routeFromHops(args), new Error(error), 'Got expected err');
    } else {
      const route = routeFromHops(args);

      delete route.payment;
      delete route.total_mtokens;

      deepIs(route, expected, 'Route is constructed as expected');
    }

    return end();
  });
});
