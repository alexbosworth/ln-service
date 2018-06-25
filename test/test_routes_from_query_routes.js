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
    expected: {routes: [{fee: 1, timeout: 31337}]},
    response: {routes: [{total_fees_msat: '1000', total_time_lock: 31337}]},
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

