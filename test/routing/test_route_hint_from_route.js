const {test} = require('tap');

const {routeHintFromRoute} = require('./../../routing');

const tests = [
  {
    args: {},
    description: 'Route is required',
    error: 'ExpectedRouteArrayToDeriveHints',
  },
  {
    args: {route: []},
    description: 'Non-empty route is required',
    error: 'ExpectedRouteArrayToDeriveHints',
  },
  {
    args: {
      route: [
        {
          public_key: Buffer.alloc(33, 1).toString('hex'),
        },
        {
          base_fee_mtokens: '1',
          channel: '66051x263430x1800',
          cltv_delta: 3,
          fee_rate: 20,
          public_key: Buffer.alloc(33, 2).toString('hex'),
        },
        {
          base_fee_mtokens: '2',
          channel: '197637x395016x2314',
          cltv_delta: 4,
          fee_rate: 30,
          public_key: Buffer.alloc(33, 3).toString('hex'),
        },
      ],
    },
    description: '',
    expected: {
      hops: [
        {
          chan_id: '72623859790382856',
          cltv_expiry_delta: 3,
          fee_base_msat: '1',
          fee_proportional_millionths: 20,
          node_id: Buffer.alloc(33, 1).toString('hex'),
        },
        {
          chan_id: '217304205466536202',
          cltv_expiry_delta: 4,
          fee_base_msat: '2',
          fee_proportional_millionths: 30,
          node_id: Buffer.alloc(33, 2).toString('hex'),
        },
      ]
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => routeHintFromRoute(args), new Error(error), 'Got error');
    } else {
      const route = routeHintFromRoute(args);

      deepIs(route, expected, 'Hints are derived as expected');
    }

    return end();
  });
});
