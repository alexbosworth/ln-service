const {test} = require('tap');

const rpcRouteAsRoute = require('./../../routing/rpc_route_as_route');

const makeRoute = override => {
  const route = {
    hops: [{
      amt_to_forward_msat: '1000',
      chan_id: '1',
      chan_capacity: 1,
      expiry: 1,
      fee_msat: '1000',
      mpp_record: {payment_addr: Buffer.alloc(1), total_amt_msat: '1'},
      pub_key: 'a',
      tlv_payload: true,
    }],
    total_amt_msat: '1000',
    total_fees_msat: '1000',
    total_time_lock: 1,
  };

  Object.keys(override).forEach(key => route[key] = override[key]);

  return route;
};

const tests = [
  {
    args: null,
    description: 'A rpc hop is required to map to a hop',
    error: 'ExpectedRpcRouteToDeriveRouteDetailsFor',
  },
  {
    args: makeRoute({hops: null}),
    description: 'A hops array is expected',
    error: 'ExpectedRouteHopsArrayInRpcRouteDetails',
  },
  {
    args: makeRoute({total_amt_msat: undefined}),
    description: 'Forward amount msat is expected',
    error: 'ExpectedTotalForwardAmountMillitokensValueForRoute',
  },
  {
    args: makeRoute({total_fees_msat: undefined}),
    description: 'Routing fees millitokens is expected',
    error: 'ExpectedTotalRoutingFeesInRpcRouteDetails',
  },
  {
    args: makeRoute({}),
    description: 'Route is returned',
    expected: {
      fee: 1,
      fee_mtokens: '1000',
      mtokens: '1000',
      payment: '00',
      timeout: 1,
      total_mtokens: '1',
    },
  },
  {
    args: makeRoute({
      hops: [{
        amt_to_forward_msat: '1000',
        chan_id: '1',
        chan_capacity: 1,
        expiry: 1,
        fee_msat: '1000',
        pub_key: 'a',
        tlv_payload: false,
      }],
    }),
    description: 'Route without MPP is returned',
    expected: {fee: 1, fee_mtokens: '1000', mtokens: '1000', timeout: 1},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(({deepIs, end, equal, throws}) => {
    if (!!error) {
      throws(() => rpcRouteAsRoute(args), new Error(error), 'Got error');
    } else {
      const route = rpcRouteAsRoute(args);

      equal(route.fee, expected.fee, 'Got expected fee');
      equal(route.fee_mtokens, expected.fee_mtokens, 'Got expected fee mtok');
      equal(route.mtokens, expected.mtokens, 'Got expected millitokens');
      equal(route.payment, expected.payment, 'Got expected payment');
      equal(route.timeout, expected.timeout, 'Got expected timeout');
      equal(route.total_mtokens, expected.total_mtokens, 'Got expected total');
    }

    return end();
  })
});
