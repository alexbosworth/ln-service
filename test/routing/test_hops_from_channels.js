const {test} = require('tap');

const betaChannels = require('./fixtures/graph_beta').channels;
const charlieChannels = require('./fixtures/graph_charlie').channels;
const {hopsFromChannels} = require('./../../routing');

const tests = [
  {
    args: {
      channels: [
        {
          capacity: 16777215,
          destination: 'b',
          id: '1x1x1',
          policies: [
            {
              base_fee_mtokens: '1000',
              fee_rate: 5000,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'a',
            },
            {
              base_fee_mtokens: '1000',
              fee_rate: 2500,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'b',
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
              cltv_delta: 30,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'c',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 40,
              fee_rate: 2500,
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
              base_fee_mtokens: '100',
              cltv_delta: 144,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'd',
            },
            {
              base_fee_mtokens: '0',
              cltv_delta: 30,
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
              base_fee_mtokens: '100',
              cltv_delta: 144,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'd',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'e',
            },
          ],
        },
      ],
    },
    description: 'Map 4 channels to 4 hops',
    expected: [
      {
        base_fee_mtokens: '1000',
        channel: '1x1x1',
        channel_capacity: 16777215,
        cltv_delta: 40,
        fee_rate: 2500,
        public_key: 'b',
      },
      {
        base_fee_mtokens: '1000',
        channel: '2x2x2',
        channel_capacity: 16777215,
        cltv_delta: 30,
        fee_rate: 2500,
        public_key: 'c',
      },
      {
        base_fee_mtokens: '0',
        channel: '3x3x3',
        channel_capacity: 16777215,
        cltv_delta: 144,
        fee_rate: 1,
        public_key: 'd',
      },
      {
        base_fee_mtokens: '100',
        channel: '4x4x4',
        channel_capacity: 16777215,
        cltv_delta: 144,
        fee_rate: 1,
        public_key: 'e',
      },
    ],
  },
  {
    args: {
      channels: betaChannels,
      destination: '03277a99c297a53859b42a9bb8cb2c5c17b9eaa44509bae150e2ea35ca5aa29bd9',
    },
    description: 'Map channels to hops',
    expected: [
      {
        base_fee_mtokens: '1000',
        channel: '544163x1208x0',
        channel_capacity: 8429350,
        cltv_delta: 40,
        fee_rate: 2500,
        public_key: '03e50492eab4107a773141bb419e107bda3de3d55652e6e1a41225f06a0bbf2d56',
      },
      {
        base_fee_mtokens: '1000',
        channel: '549188x2650x1',
        channel_capacity: 2000000,
        cltv_delta: 40,
        fee_rate: 2500,
        public_key: '03bb88ccc444534da7b5b64b4f7b15e1eccb18e102db0e400d4b9cfe93763aa26d',
      },
      {
        base_fee_mtokens: '1000',
        channel: '532368x256x1',
        channel_capacity: 400000,
        cltv_delta: 40,
        fee_rate: 100,
        public_key: '028dcc199be86786818c8c32bffe9db8855c5fca98951eec99d1fa335d841605c2',
      },
      {
        base_fee_mtokens: '1000',
        channel: '550597x834x0',
        channel_capacity: 364355,
        cltv_delta: 40,
        fee_rate: 1,
        public_key: '03277a99c297a53859b42a9bb8cb2c5c17b9eaa44509bae150e2ea35ca5aa29bd9',
      },
    ],
  },
  {
    args: {channels: charlieChannels},
    description: 'Mapping channels to hops results in a hops list',
    expected: [
      {
        base_fee_mtokens: '1234',
        channel: '0',
        channel_capacity: 1000,
        cltv_delta: 40,
        fee_rate: 7,
        public_key: 'alice',
      },
      {
        base_fee_mtokens: '1234',
        channel: '1',
        channel_capacity: 2000,
        cltv_delta: 40,
        fee_rate: 7,
        public_key: 'bob',
      },
      {
        base_fee_mtokens: '3000',
        channel: '2',
        channel_capacity: 3000,
        cltv_delta: 40,
        fee_rate: 9,
        public_key: 'charlie',
      },
    ],
  },
  {
    args: {
      channels: [{
        capacity: 100,
        destination: Buffer.alloc(33).toString('hex'),
        id: '1x1x1',
        policies: [
          {
            base_fee_mtokens: '1',
            fee_rate: 1,
            is_disabled: false,
            min_htlc_mtokens: '1',
            public_key: Buffer.alloc(33).toString('hex'),
          },
          {
            base_fee_mtokens: '1',
            fee_rate: 1,
            is_disabled: false,
            min_htlc_mtokens: '1',
            public_key: Buffer.alloc(33, 1).toString('hex'),
          },
        ],
      }],
    },
    description: 'Mapping channels without a CLTV results in a default CLTV',
    expected: [{
      base_fee_mtokens: '1',
      channel: '1x1x1',
      channel_capacity: 100,
      cltv_delta: 40,
      fee_rate: 1,
      public_key: Buffer.alloc(33).toString('hex'),
    }],
  },
  {
    args: {},
    description: 'Mapping hops from channels requires channels',
    error: 'ExpectedChannelsToDeriveHops',
  },
  {
    args: {channels: []},
    description: 'Mapping hops from channels requires channels array',
    error: 'ExpectedChannelsToDeriveHops',
  },
  {
    args: {channels: [{}]},
    description: 'Mapping hops from channels requires channels with policies',
    error: 'ExpectedChannelPoliciesWhenCalculatingHops',
  },
  {
    args: {channels: [{policies: []}]},
    description: 'Mapping hops from channels requires next hop public key',
    error: 'ExpectedNextHopPublicKey',
  },
  {
    args: {channels: [{destination: 'destination', policies: []}]},
    description: 'Mapping hops from channels requires hop channel ids',
    error: 'ExpectedChannelIdForTranslationToChannelHop',
  },
  {
    args: {channels: [{destination: 'destination', id: 'id', policies: []}]},
    description: 'Mapping hops from channels requires hop channel ids',
    expected: [],
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => hopsFromChannels(args), new Error(error), 'Got error');
    } else {
      const {hops} = hopsFromChannels(args);

      deepIs(hops, expected, 'Hops returned as expected');
    }

    return end();
  });
});
