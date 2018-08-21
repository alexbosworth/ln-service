const {deepIs} = require('tap');
const {throws} = require('tap');

const {routesFromQueryRoutes} = require('./../lnd');

const tests = [
  {
    _: 'No response',
    error: 'ExpectedResponse',
  },

  {
    _: 'No routes',
    error: 'ExpectedRoutes',
    response: {},
  },

  {
    _: 'Empty routes',
    error: 'ExpectedMultipleRoutes',
    response: {routes: []},
  },

  {
    _: 'Invalid fees',
    error: 'ExpectedValidRoutes',
    response: {routes: [{total_fees_msat: null, total_time_lock: 31337}]},
  },

  {
    _: 'Valid routes',
    expected: {routes: [
      {
        fee: 1,
        fee_mtokens: '1000',
        timeout: 31337,
        tokens: 830497,
        mtokens: '830497000',
        hops: [{
          chan_id: "1487411633484267520",
          chan_capacity: "16270430",
          amt_to_forward: "830497",
          fee: "1",
          expiry: 1385001,
          amt_to_forward_msat: "830497000",
          fee_msat: "1000"
        }],
      }
    ]},
    response: {routes: [
      {
        total_fees: '1',
        total_fees_msat: '1000',
        total_time_lock: 31337,
        total_amt: '830497',
        total_amt_msat: '830497000',
        hops: [{
          chan_id: "1487411633484267520",
          chan_capacity: "16270430",
          amt_to_forward: "830497",
          fee: "1",
          expiry: 1385001,
          amt_to_forward_msat: "830497000",
          fee_msat: "1000"
        }],
      }
    ]},
  },
];

tests.forEach(({error, expected, response}) => {
  switch (!!error) {
  case false:
    return deepIs(routesFromQueryRoutes({response}), expected);

  case true:
    return throws(() => routesFromQueryRoutes({response}), new Error(error));
  }
});
