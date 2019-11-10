const {test} = require('tap');

const {routeFromChannels} = require('./../../routing');

const makeChannel = args => {
  return {
    capacity: 1e6,
    destination: args.destination,
    id: `${args.number}x${args.number}x${args.number}`,
    policies: [
      {
        base_fee_mtokens: args.base_fee_mtokens,
        cltv_delta: args.cltv_delta,
        fee_rate: args.fee_rate,
        is_disabled: false,
        min_htlc_mtokens: 1e3,
        public_key: `pubkey-${args.number}`,
      },
      {
        base_fee_mtokens: '99',
        cltv_delta: args.cltv_delta,
        fee_rate: 9,
        is_disabled: true,
        min_htlc_mtokens: 1e6,
        public_key: args.destination,
      },
    ],
  };
};

const tests = [
  {
    args: {
      channels: [
        makeChannel({
          base_fee_mtokens: '100',
          fee_rate: 1000,
          cltv_delta: 1,
          destination: 'b',
          number: 1,
        }),
      ],
      cltv_delta: 1,
      destination: 'b',
      height: 100,
      mtokens: '100000',
    },
    description: 'Single channel means no delays or fees',
    expected: {
      route: {
        fee: 0,
        fee_mtokens: '0',
        hops: [{
          channel: '1x1x1',
          channel_capacity: 1000000,
          fee: 0,
          fee_mtokens: '0',
          forward: 100,
          forward_mtokens: '100000',
          public_key: 'b',
          timeout: 101,
       }],
       mtokens: '100000',
       timeout: 101,
       tokens: 100,
      },
    },
  },
  {
    args: {
      channels: [
        makeChannel({
          base_fee_mtokens: '0',
          fee_rate: 1000,
          cltv_delta: 5,
          destination: 'b',
          number: 1,
        }),
        makeChannel({
          base_fee_mtokens: '30',
          fee_rate: 1000,
          cltv_delta: 5,
          destination: 'c',
          number: 2,
        }),
      ],
      cltv_delta: 1,
      destination: 'c',
      height: 100,
      mtokens: '100000',
    },
    description: 'Two channels has one fee',
    expected: {
      route: {
        fee: 0,
        fee_mtokens: '130',
        hops: [
          {
            channel: '1x1x1',
            channel_capacity: 1000000,
            fee: 0,
            fee_mtokens: '130',
            forward: 100,
            forward_mtokens: '100000',
            public_key: 'b',
            timeout: 101,
         },
         {
           channel: '2x2x2',
           channel_capacity: 1000000,
           fee: 0,
           fee_mtokens: '0',
           forward: 100,
           forward_mtokens: '100000',
           public_key: 'c',
           timeout: 101,
        },
       ],
       mtokens: '100130',
       timeout: 106,
       tokens: 100,
      },
    },
  },
  {
    args: {
      channels: [
        makeChannel({
          base_fee_mtokens: '0',
          fee_rate: 10,
          cltv_delta: 3,
          destination: 'b',
          number: 1,
        }),
        makeChannel({
          base_fee_mtokens: '0',
          fee_rate: 10,
          cltv_delta: 5,
          destination: 'c',
          number: 2,
        }),
        makeChannel({
          base_fee_mtokens: '0',
          fee_rate: 10,
          cltv_delta: 3,
          destination: 'd',
          number: 3,
        }),
      ],
      cltv_delta: 1,
      destination: 'd',
      height: 100,
      mtokens: '100000',
    },
    description: 'Three channel fees stack up',
    expected: {
      route: {
        fee: 0,
        fee_mtokens: '2',
        hops: [
          {
            channel: '1x1x1',
            channel_capacity: 1000000,
            fee: 0,
            fee_mtokens: '1',
            forward: 100,
            forward_mtokens: '100001',
            public_key: 'b',
            timeout: 104,
         },
         {
           channel: '2x2x2',
           channel_capacity: 1000000,
           fee: 0,
           fee_mtokens: '1',
           forward: 100,
           forward_mtokens: '100000',
           public_key: 'c',
           timeout: 101,
        },
        {
          channel: '3x3x3',
          channel_capacity: 1000000,
          fee: 0,
          fee_mtokens: '0',
          forward: 100,
          forward_mtokens: '100000',
          public_key: 'd',
          timeout: 101,
       },
       ],
       mtokens: '100002',
       timeout: 109,
       tokens: 100,
      },
    },
  },
  {
    args: {
      channels: [
        makeChannel({
          base_fee_mtokens: '0',
          fee_rate: 10000,
          cltv_delta: 3,
          destination: 'b',
          number: 1,
        }),
        makeChannel({
          base_fee_mtokens: '0',
          fee_rate: 10000,
          cltv_delta: 5,
          destination: 'c',
          number: 2,
        }),
        makeChannel({
          base_fee_mtokens: '0',
          fee_rate: 10000,
          cltv_delta: 3,
          destination: 'd',
          number: 3,
        }),
      ],
      cltv_delta: 1,
      destination: 'd',
      height: 100,
      mtokens: '100000',
    },
    description: 'Three channels show carry over of fees',
    expected: {
      route: {
        fee: 2,
        fee_mtokens: '2010',
        hops: [
          {
            channel: '1x1x1',
            channel_capacity: 1000000,
            fee: 1,
            fee_mtokens: '1010',
            forward: 101,
            forward_mtokens: '101000',
            public_key: 'b',
            timeout: 104,
         },
         {
           channel: '2x2x2',
           channel_capacity: 1000000,
           fee: 1,
           fee_mtokens: '1000',
           forward: 100,
           forward_mtokens: '100000',
           public_key: 'c',
           timeout: 101,
        },
        {
          channel: '3x3x3',
          channel_capacity: 1000000,
          fee: 0,
          fee_mtokens: '0',
          forward: 100,
          forward_mtokens: '100000',
          public_key: 'd',
          timeout: 101,
       },
       ],
       mtokens: '102010',
       timeout: 109,
       tokens: 102,
      },
    },
  },
  {
    args: {
      channels: [
        makeChannel({
          base_fee_mtokens: '0',
          fee_rate: 10000,
          cltv_delta: 3,
          destination: 'b',
          number: 1,
        }),
        makeChannel({
          base_fee_mtokens: '0',
          fee_rate: 1000,
          cltv_delta: 5,
          destination: 'c',
          number: 2,
        }),
        makeChannel({
          base_fee_mtokens: '1000',
          fee_rate: 0,
          cltv_delta: 3,
          destination: 'd',
          number: 3,
        }),
      ],
      cltv_delta: 1,
      destination: 'd',
      height: 100,
      mtokens: '100000',
    },
    description: 'Fees carry over more',
    expected: {
      route: {
        fee: 1,
        fee_mtokens: '1101',
        hops: [
          {
            channel: '1x1x1',
            channel_capacity: 1000000,
            fee: 0,
            fee_mtokens: '101',
            forward: 101,
            forward_mtokens: '101000',
            public_key: 'b',
            timeout: 104,
         },
         {
           channel: '2x2x2',
           channel_capacity: 1000000,
           fee: 1,
           fee_mtokens: '1000',
           forward: 100,
           forward_mtokens: '100000',
           public_key: 'c',
           timeout: 101,
        },
        {
          channel: '3x3x3',
          channel_capacity: 1000000,
          fee: 0,
          fee_mtokens: '0',
          forward: 100,
          forward_mtokens: '100000',
          public_key: 'd',
          timeout: 101,
       },
       ],
       mtokens: '101101',
       timeout: 109,
       tokens: 101,
      },
    },
  },
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
      cltv_delta: 46,
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
            timeout: 1574952
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
        timeout: 1574992,
        tokens: 1001,
      }
    },
  },
  {
    args: {
      channels: [
        {
          capacity: 16777215,
          destination: 'b',
          id: '1x1x1',
          policies: [
            {
              base_fee_mtokens: '0',
              cltv_delta: 29,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'b',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 40,
              fee_rate: 2500,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'a',
            },
          ],
        },
        {
          capacity: 16777215,
          destination: 'c',
          id: '2x2x2',
          policies: [
            {
              base_fee_mtokens: '0',
              cltv_delta: 29,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'b',
            },
            {
              base_fee_mtokens: '1',
              cltv_delta: 40,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'c',
            },
          ],
        },
        {
          capacity: 16777215,
          destination: 'd',
          id: '3x3x3',
          policies: [
            {
              base_fee_mtokens: '0',
              cltv_delta: 72,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'd',
            },
            {
              base_fee_mtokens: '1',
              cltv_delta: 40,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'c',
            },
          ],
        },
      ],
      cltv_delta: 1,
      destination: 'd',
      height: 592311,
      mtokens: '500000000',
    },
    description: 'A route is derived across 3 channels with varying cltvs',
    expected: {
      route: {
        fee: 1,
        fee_mtokens: '1001',
        hops: [
          {
            channel: '1x1x1',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '500',
            forward: 500000,
            forward_mtokens: '500000501',
            public_key: 'b',
            timeout: 592352
          },
          {
            channel: '2x2x2',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '501',
            forward: 500000,
            forward_mtokens: '500000000',
            public_key: 'c',
            timeout: 592312,
          },
          {
            channel: '3x3x3',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '0',
            forward: 500000,
            forward_mtokens: '500000000',
            public_key: 'd',
            timeout: 592312,
          },
        ],
        mtokens: '500001001',
        timeout: 592381,
        tokens: 500001,
      }
    },
  },
  {
    args: {
      channels: [
        {
          capacity: 16777215,
          destination: 'b',
          id: '1x1x1',
          policies: [
            {
              base_fee_mtokens: '0',
              cltv_delta: 30,
              fee_rate: 2,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'b',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 2500,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'a',
            },
          ],
        },
        {
          capacity: 16777215,
          destination: 'c',
          id: '2x2x2',
          policies: [
            {
              base_fee_mtokens: '10',
              cltv_delta: 14,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '10',
              public_key: 'c',
            },
            {
              base_fee_mtokens: '1',
              cltv_delta: 30,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'b',
            },
          ],
        },
        {
          capacity: 16777215,
          destination: 'd',
          id: '3x3x3',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '0',
              public_key: 'd',
            },
            {
              base_fee_mtokens: '10',
              cltv_delta: 14,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'c',
            },
          ],
        },
        {
          capacity: 16777215,
          destination: 'e',
          id: '4x4x4',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '0',
              public_key: 'd',
            },
            {
              base_fee_mtokens: '0',
              cltv_delta: 144,
              fee_rate: 6,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'e',
            },
          ],
        },
      ],
      cltv_delta: 1,
      destination: '3',
      height: 592317,
      mtokens: '500000000',
    },
    description: 'A route is derived across 4 channels with varying cltvs',
    expected: {
      route: {
        fee: 2,
        fee_mtokens: '2511',
        hops: [
          {
            channel: '1x1x1',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '501',
            forward: 500002,
            forward_mtokens: '500002010',
            public_key: 'b',
            timeout: 592476
          },
          {
            channel: '2x2x2',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '510',
            forward: 500001,
            forward_mtokens: '500001500',
            public_key: 'c',
            timeout: 592462,
          },
          {
            channel: '3x3x3',
            channel_capacity: 16777215,
            fee: 1,
            fee_mtokens: '1500',
            forward: 500000,
            forward_mtokens: '500000000',
            public_key: 'd',
            timeout: 592318,
          },
          {
            channel: '4x4x4',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '0',
            forward: 500000,
            forward_mtokens: '500000000',
            public_key: 'e',
            timeout: 592318,
          },
        ],
        mtokens: '500002511',
        timeout: 592506,
        tokens: 500002,
      }
    },
  },
  {
    args: {
      channels: [
        {
          capacity: 16777215,
          destination: 'b',
          id: '1x1x1',
          policies: [
            {
              base_fee_mtokens: '1',
              cltv_delta: 30,
              fee_rate: 2,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'b',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 2500,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'a',
            },
          ],
        },
        {
          capacity: 16777215,
          destination: 'c',
          id: '2x2x2',
          policies: [
            {
              base_fee_mtokens: '1',
              cltv_delta: 4,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'b',
            },
            {
              base_fee_mtokens: '1',
              cltv_delta: 4,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'c',
            },
          ],
        },
        {
          capacity: 16777215,
          destination: 'd',
          id: '3x3x3',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'd',
            },
            {
              base_fee_mtokens: '1',
              cltv_delta: 30,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'c',
            },
          ],
        },
      ],
      cltv_delta: 1,
      destination: 'd',
      height: 592319,
      mtokens: '500000000',
    },
    description: 'A route is derived across 3 channels with minimal cltvs',
    expected: {
      route: {
        fee: 1,
        fee_mtokens: '1002',
        hops: [
          {
            channel: '1x1x1',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '501',
            forward: 500000,
            forward_mtokens: '500000501',
            public_key: 'b',
            timeout: 592350
          },
          {
            channel: '2x2x2',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '501',
            forward: 500000,
            forward_mtokens: '500000000',
            public_key: 'c',
            timeout: 592320,
          },
          {
            channel: '3x3x3',
            channel_capacity: 16777215,
            fee: 0,
            fee_mtokens: '0',
            forward: 500000,
            forward_mtokens: '500000000',
            public_key: 'd',
            timeout: 592320,
          },
        ],
        mtokens: '500001002',
        timeout: 592354,
        tokens: 500001,
      }
    },
  },
  {
    args: {},
    description: 'Channels are required',
    error: 'ExpectedChannelsToFormRouteToDestination',
  },
  {
    args: {channels: []},
    description: 'Channels are required',
    error: 'ExpectedChannelsToFormRouteToDestination',
  },
  {
    args: {channels: [{}]},
    description: 'A destination is required',
    error: 'ExpectedDestinationForRouteToDestination',
  },
  {
    args: {channels: [{destination: 'destination'}]},
    description: 'A height is required',
    error: 'ExpectedHeightToCalculateRouteToDestination',
  },
  {
    args: {channels: [{}], destination: 'destination'},
    description: 'A height is required',
    error: 'ExpectedHeightToCalculateRouteToDestination',
  },
  {
    args: {channels: [{destination: 'destination'}], height: 1},
    description: 'An amount to send is required',
    error: 'ExpectedMillitokensToSendOnRouteToDestination',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => routeFromChannels(args), new Error(error), 'Got error');
    } else {
      const {route} = routeFromChannels(args);

      delete route.payment;
      delete route.total_mtokens;

      deepIs(route, expected.route, 'Route is constructed as expected');
    }

    return end();
  });
});
