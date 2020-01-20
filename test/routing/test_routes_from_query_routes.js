const {stringify} = JSON;

const {test} = require('tap');

const {routesFromQueryRoutes} = require('./../../routing');

const recordType = '11903';

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
    description: 'Invalid timelock',
    error: 'ExpectedValidRoutes',
    response: {routes: [{total_fees_msat: '1', total_time_lock: null}]},
  },
  {
    description: 'Invalid hops',
    error: 'ExpectedValidRoutes',
    response: {routes: [{total_fees_msat: '1', total_time_lock: 31337}]},
  },
  {
    description: 'Invalid channel id',
    error: 'ExpectedValidHopChannelIdsInRoutes',
    response: {
      routes: [{hops: [{}], total_fees_msat: '1', total_time_lock: 31337}],
    },
  },
  {
    description: 'Valid routes',
    expected: {
      routes: [{
        confidence: 1,
        fee: 1,
        fee_mtokens: '1000',
        hops: [{
          channel: '1352793x157x0',
          channel_capacity: 16270430,
          fee: 1,
          fee_mtokens: '1000',
          forward: 830497,
          forward_mtokens: '830497000',
          timeout: 1385001,
        }],
        messages: [{type: recordType, value: '01010101'}],
        mtokens: '830497000',
        safe_fee: 1,
        safe_tokens: 830497,
        timeout: 31337,
        tokens: 830497,
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
          amt_to_forward: '830497',
          amt_to_forward_msat: '830497000',
          chan_capacity: '16270430',
          chan_id: '1487411633484267520',
          custom_records: [{
            type: recordType,
            value: Buffer.alloc(4, 1),
          }].reduce((sum, n) => {
            const buf = Buffer.alloc(8);

            buf.writeBigInt64LE(BigInt(n.type));

            sum[buf.toString('ascii')] = n.value;

            return sum;
          }, {}),
          expiry: 1385001,
          fee: '1',
          fee_msat: '1000',
        }],
      }],
      success_prob: 0.000001,
    },
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
