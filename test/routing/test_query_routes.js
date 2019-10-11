const {test} = require('tap');

const {queryRoutes} = require('./../../routing');

const tests = [
  {
    args: {},
    description: 'A destination is required to query routes',
    error: [400, 'ExpectedDestinationOrRoutesToQueryRoutes'],
  },
  {
    args: {destination: 'b'},
    description: 'An array of ignored edges is required to query routes',
    error: [400, 'ExpectedAuthenticatedLndToQueryRoutes'],
  },
  {
    args: {routes: []},
    description: 'Routes can substitute for a destination',
    error: [400, 'ExpectedAuthenticatedLndToQueryRoutes'],
  },
  {
    args: {lnd: {}, routes: [{}]},
    description: 'Routes must be an array of hops',
    error: [400, 'ExpectedArrayOfExtendedHopsWhenQueryingRoutes'],
  },
  {
    args: {lnd: {}, routes: [[{}]]},
    description: 'Route extensions must create public keys',
    error: [400, 'ExpectedPublicKeyInExtendedRoute'],
  },
  {
    args: {
      lnd: {},
      routes: [[
        {channel: '1x1x1', public_key: 'a'},
        {channel: '2x2x2', public_key: 'b'},
      ]],
    },
    description: 'Route extensions must create public keys',
    expected: {
      results: [{
        extended: [{channel: '2x2x2', public_key: 'b'}],
        routes: [],
      }],
    },
  },
  {
    args: {
      destination: 'b',
      lnd: {default: {queryRoutes: ({}, cbk) => cbk({code: 0})}},
    },
    description: 'A route note found error shows as no route possibilities',
    expected: {results: [{routes: []}]},
  },
  {
    args: {
      destination: 'b',
      ignores: [{to_public_key: 'c'}],
      lnd: {
        default: {
          queryRoutes: (args, cbk) => cbk(args),
        },
      },
      outgoing_channel: '1x1x1',
      start_public_key: 'c',
    },
    description: 'When an outgoing chan is given, do not ignore the start key',
    error: [
      503,
      'UnexpectedQueryRoutesError',
      {
        fee_limit: null,
        ignored_edges: null,
        ignored_nodes: null,
        use_mission_control: null,
      },
    ],
  },
  {
    args: {
      destination: 'b',
      ignores: [{channel: '2x2x2', to_public_key: 'c'}],
      lnd: {
        default: {
          queryRoutes: (args, cbk) => cbk(args),
        },
      },
      max_fee: 1,
      outgoing_channel: '1x1x1',
      start_public_key: 'c',
    },
    description: 'When an outgoing chan is given, do not ignore the start key',
    error: [
      503,
      'UnexpectedQueryRoutesError',
      {
        fee_limit: null,
        ignored_edges: null,
        ignored_nodes: null,
        use_mission_control: null,
      },
    ],
  },
  {
    args: {
      destination: 'b',
      lnd: {default: {queryRoutes: ({}, cbk) => cbk({code: 99})}},
    },
    description: 'An undefined error returns an error code',
    error: [503, 'UnexpectedQueryRoutesError', {err: {code: 99}}],
  },
  {
    args: {
      destination: 'b',
      lnd: {default: {queryRoutes: ({}, cbk) => cbk()}},
    },
    description: 'Invalid query routes response returns error',
    error: [
      503,
      'InvalidGetRoutesResponse',
      {err: new Error('ExpectedResponse')},
    ],
  },
  {
    args: {
      destination: 'b',
      lnd: {
        default: {
          queryRoutes: ({}, cbk) => cbk(null, {
            routes: [{
              hops: [{
                amt_to_forward_msat: '1',
                chan_capacity: 1,
                chan_id: '1',
                expiry: 1,
                fee: '0',
                fee_msat: '1',
                pub_key: 'b',
              }],
              total_amt: 0,
              total_amt_msat: '1',
              total_fees: '0',
              total_fees_msat: '1',
              total_time_lock: 1,
            }],
            success_prob: 0.000001,
          }),
        },
      },
    },
    description: 'A route should be mapped to a route',
    expected: {
      results: [{
        extended: [],
        routes: [{
          confidence: 1,
          fee: 0,
          fee_mtokens: '1',
          hops: [{
            channel: '0x0x1',
            channel_capacity: 1,
            fee: 0,
            fee_mtokens: '1',
            forward: 0,
            forward_mtokens: '1',
            public_key: 'b',
            timeout: 1,
          }],
          mtokens: '1',
          timeout: 1,
          tokens: 0,
        }],
      }],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, rejects}) => {
    if (!!error) {
      rejects(queryRoutes(args), error, 'Got expected error');
    } else {
      deepIs(await queryRoutes(args), expected, 'Got expected paths');
    }

    return end();
  });
});
