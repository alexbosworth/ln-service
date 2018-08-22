const {stringify} = JSON;

const {test} = require('tap');

const {routesFromQueryRoutes} = require('./../lnd');

const tests = [
  {
    description: 'No response',
    error: 'ExpectedResponse',
  },

  {
    description: 'No routes',
    error: 'ExpectedRoutes',
    response: {},
  },

  {
    description: 'Empty routes',
    error: 'ExpectedMultipleRoutes',
    response: {routes: []},
  },

  {
    description: 'Invalid fees',
    error: 'ExpectedValidRoutes',
    response: {routes: [{total_fees_msat: null, total_time_lock: 31337}]},
  },

  {
    description: 'Valid routes',
    expected: {
      routes: [{
        fee: 1,
        fee_mtokens: '1000',
        hops: [{
          channel_capacity: 16270430,
          channel_id: "1487411633484267520",
          fee: 1,
          fee_mtokens: '1000',
          forward: 830497,
          forward_mtokens: "830497000",
          timeout: 1385001,
        }],
        timeout: 31337,
        tokens: 830497,
        mtokens: '830497000',
      },
    ]},
    response: {
      routes: [{
        total_fees: '1',
        total_fees_msat: '1000',
        total_time_lock: 31337,
        total_amt: '830497',
        total_amt_msat: '830497000',
        hops: [{
          amt_to_forward: "830497",
          amt_to_forward_msat: "830497000",
          chan_capacity: "16270430",
          chan_id: "1487411633484267520",
          expiry: 1385001,
          fee: "1",
          fee_msat: "1000",
        }],
      },
    ]},
  },
];

tests.forEach(({description, error, expected, response}) => {
  return test(({end, equal, throws}) => {
    if (!!error) {
      throws(() => routesFromQueryRoutes({response}), new Error(error));

      return end();
    }

    const {routes} = routesFromQueryRoutes({response});

    equal(stringify(routes), stringify(expected.routes))

    return end();
  })
});

