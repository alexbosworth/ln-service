const {test} = require('@alexbosworth/tap');

const {routeFromRouteHint} = require('./../../routing');

const tests = [
  {
    args: {},
    description: 'A destination is required',
    error: 'ExpectedPaymentRequestDestinationToCalculateRoute'
  },
  {
    args: {destination: 'destination'},
    description: 'Hop hints are required',
    error: 'ExpectedRouteHopHints',
  },
  {
    args: {destination: 'destination', hop_hints: []},
    description: 'Hop hints are required',
    error: 'ExpectedRouteHopHints',
  },
  {
    args: {destination: 'destination', hop_hints: [{}]},
    description: 'Route hop channel id is required in hop hint',
    error: 'ExpectedRouteHopChannelIdInRouteHint',
  },
  {
    args: {destination: 'destination', hop_hints: [{chan_id: '1'}]},
    description: 'Route hop cltv delta is required in hop hint',
    error: 'ExpectedRouteHopCltvExpiryDeltaInRouteHint',
  },
  {
    args: {
      destination: 'destination',
      hop_hints: [{chan_id: '1', cltv_expiry_delta: 1}],
    },
    description: 'Route hop base fee is required in hop hint',
    error: 'ExpectedRouteHopBaseFeeInRouteHint',
  },
  {
    args: {
      destination: 'destination',
      hop_hints: [{chan_id: '1', cltv_expiry_delta: 1, fee_base_msat: '1'}],
    },
    description: 'Route hop fee rate is required in hop hint',
    error: 'ExpectedRouteHopFeeRateInRouteHint',
  },
  {
    args: {
      destination: 'destination',
      hop_hints: [{
        chan_id: '1',
        cltv_expiry_delta: 1,
        fee_base_msat: '1',
        fee_proportional_millionths: '1',
      }],
    },
    description: 'Route hop node id is required in hop hint',
    error: 'ExpectedRouteHopPublicKeyInRouteHint',
  },
  {
    args: {
      destination: 'destination',
      hop_hints: [{
        chan_id: '1',
        cltv_expiry_delta: 1,
        fee_base_msat: '1',
        fee_proportional_millionths: '1',
        node_id: 'id',
      }],
    },
    description: 'Route mapped from route hints',
    expected: {
      route: [
        {
          public_key: 'id',
        },
        {
          base_fee_mtokens: '1',
          channel: '0x0x1',
          cltv_delta: 1,
          fee_rate: '1',
          public_key: 'destination',
        },
      ],
    },
  },
  {
    args: {
      destination: 'destination',
      hop_hints: [
        {
          chan_id: '1',
          cltv_expiry_delta: 1,
          fee_base_msat: '1',
          fee_proportional_millionths: '1',
          node_id: 'id1',
        },
        {
          chan_id: '2',
          cltv_expiry_delta: 2,
          fee_base_msat: '2',
          fee_proportional_millionths: '2',
          node_id: 'id2',
        },
      ],
    },
    description: 'Route hops mapped from multiple hints',
    expected: {
      route: [
        {
          public_key: 'id1',
        },
        {
          base_fee_mtokens: '1',
          channel: '0x0x1',
          cltv_delta: 1,
          fee_rate: '1',
          public_key: 'id2',
        },
        {
          base_fee_mtokens: '2',
          channel: '0x0x2',
          cltv_delta: 2,
          fee_rate: '2',
          public_key: 'destination',
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => routeFromRouteHint(args), new Error(error), 'Got error');
    } else {
      deepIs(routeFromRouteHint(args), expected.route, 'Got expected route');
    }

    return end();
  });
});
