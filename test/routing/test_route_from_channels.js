const {test} = require('tap');

const {routeFromChannels} = require('./../../routing');

const tests = [
  {
    args: {
      channels: [
        {
          capacity: 16777215,
          destination: '034cf28d9667b386cee172f38a98033b391996163d5755bc47d624c3832386e4bc',
          id: '1x1x1',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 40,
              fee_rate: 2500,
              is_disabled: false,
              min_htlc_mtokens: 1000,
              public_key: '027455aef8453d92f4706b560b61527cc217ddf14da41770e8ed6607190a1851b8',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 40,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: '034cf28d9667b386cee172f38a98033b391996163d5755bc47d624c3832386e4bc',
            },
          ],
        },
        {
          capacity: 16777215,
          destination: '0270685ca81a8e4d4d01beec5781f4cc924684072ae52c507f8ebe9daf0caaab7b',
          id: '2x2x2',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 40,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: '0270685ca81a8e4d4d01beec5781f4cc924684072ae52c507f8ebe9daf0caaab7b',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 40,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: '034cf28d9667b386cee172f38a98033b391996163d5755bc47d624c3832386e4bc',
            },
          ],
        },
        {
          capacity: 16777215,
          destination: '03ee83ec25fc43cf1d683be47fd5e2ac39713a489b03fed4350d9623be1ff0d817',
          id: '3x3x3',
          policies: [
            {
              base_fee_mtokens: '1',
              cltv_delta: 30,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: '0270685ca81a8e4d4d01beec5781f4cc924684072ae52c507f8ebe9daf0caaab7b',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: '03ee83ec25fc43cf1d683be47fd5e2ac39713a489b03fed4350d9623be1ff0d817',
            },
          ],
        },
      ],
      cltv: 46,
      destination: '03ee83ec25fc43cf1d683be47fd5e2ac39713a489b03fed4350d9623be1ff0d817',
      height: 1574876,
      mtokens: '1000000',
    },
    description: 'A route is derived from a set of channels',
    expected: {
      route: {
        fee: 1,
        fee_mtokens: '1003',
        hops: [
          {
            channel: '1x1x1',
            channel_capacity: 16777215,
            fee: 1,
            fee_mtokens: '1001',
            forward: 1000,
            forward_mtokens: '1000002',
            public_key: '034cf28d9667b386cee172f38a98033b391996163d5755bc47d624c3832386e4bc',
            timeout: 1574962
          },
          {
            channel: '2x2x2',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '2',
            forward: 1000,
            forward_mtokens: '1000000',
            public_key: '0270685ca81a8e4d4d01beec5781f4cc924684072ae52c507f8ebe9daf0caaab7b',
            timeout: 1574922,
          },
          {
            channel: '3x3x3',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '0',
            forward: 1000,
            forward_mtokens: '1000000',
            public_key: '03ee83ec25fc43cf1d683be47fd5e2ac39713a489b03fed4350d9623be1ff0d817',
            timeout: 1574922,
          },
        ],
        mtokens: '1001003',
        timeout: 1575002,
        tokens: 1001,
      }
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end}) => {
    const route = routeFromChannels(args);

    deepIs(route, expected, 'Route is constructed as expected');

    return end();
  });
});
