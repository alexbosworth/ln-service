const {test} = require('tap');

const {hopsFromChannels} = require('./../../routing');

const tests = [
  {
    args: {
      channels: [
        {
          capacity: 8429350,
          destination: '03e50492eab4107a773141bb419e107bda3de3d55652e6e1a41225f06a0bbf2d56',
          id: '598313545984638976',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 5000,
              public_key: '038c09dffaf09a858b1e8d06212dfa4ba543b11bbbd485116698e3eb6ee0f38bb9',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 2500,
              public_key: '03e50492eab4107a773141bb419e107bda3de3d55652e6e1a41225f06a0bbf2d56',
            },
          ],
        },
        {
          capacity: 2000000,
          destination: '03bb88ccc444534da7b5b64b4f7b15e1eccb18e102db0e400d4b9cfe93763aa26d',
          id: '603838592008716289',
          policies: [
            {
              base_fee_mtokens: '0',
              cltv_delta: 144,
              fee_rate: 10,
              public_key: '03bb88ccc444534da7b5b64b4f7b15e1eccb18e102db0e400d4b9cfe93763aa26d',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 2500,
              public_key: '03e50492eab4107a773141bb419e107bda3de3d55652e6e1a41225f06a0bbf2d56',
            },
          ],
        },
        {
          capacity: 400000,
          destination: '028dcc199be86786818c8c32bffe9db8855c5fca98951eec99d1fa335d841605c2',
          id: '585344806272630785',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 100,
              public_key: '028dcc199be86786818c8c32bffe9db8855c5fca98951eec99d1fa335d841605c2',
            },
            {
              base_fee_mtokens: '0',
              cltv_delta: 144,
              fee_rate: 10,
              public_key: '03bb88ccc444534da7b5b64b4f7b15e1eccb18e102db0e400d4b9cfe93763aa26d',
            },
          ],
        },
        {
          capacity: 364355,
          destination: '03277a99c297a53859b42a9bb8cb2c5c17b9eaa44509bae150e2ea35ca5aa29bd9',
          id: '605387803773239296',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 100,
              public_key: '028dcc199be86786818c8c32bffe9db8855c5fca98951eec99d1fa335d841605c2',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 1,
              public_key: '03277a99c297a53859b42a9bb8cb2c5c17b9eaa44509bae150e2ea35ca5aa29bd9',
            },
          ],
        },
      ],
    },
    description: 'Map channels to hops',
    expected: [
      {
        base_fee_mtokens: '1000',
        channel_capacity: 8429350,
        channel_id: '598313545984638976',
        cltv_delta: 144,
        fee_rate: 2500,
        public_key: '03e50492eab4107a773141bb419e107bda3de3d55652e6e1a41225f06a0bbf2d56',
      },
      {
        base_fee_mtokens: '0',
        channel_capacity: 2000000,
        channel_id: '603838592008716289',
        cltv_delta: 144,
        fee_rate: 10,
        public_key: '03bb88ccc444534da7b5b64b4f7b15e1eccb18e102db0e400d4b9cfe93763aa26d',
      },
      {
        base_fee_mtokens: '1000',
        channel_capacity: 400000,
        channel_id: '585344806272630785',
        cltv_delta: 144,
        fee_rate: 100,
        public_key: '028dcc199be86786818c8c32bffe9db8855c5fca98951eec99d1fa335d841605c2',
      },
      {
        base_fee_mtokens: '1000',
        channel_capacity: 364355,
        channel_id: '605387803773239296',
        cltv_delta: 144,
        fee_rate: 1,
        public_key: '03277a99c297a53859b42a9bb8cb2c5c17b9eaa44509bae150e2ea35ca5aa29bd9',
      },
    ],
  },
  {
    args: {
      channels: [
        {
          capacity: 1000,
          destination: 'alice',
          id: '0',
          policies: [
            {
              base_fee_mtokens: '9999',
              cltv_delta: 999,
              fee_rate: 9,
              public_key: 'origin',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 144,
              fee_rate: 1,
              public_key: 'alice',
            },
          ],
        },
        {
          capacity: 2000,
          destination: 'bob',
          id: '1',
          policies: [
            {
              base_fee_mtokens: '9999',
              cltv_delta: 999,
              fee_rate: 9,
              public_key: 'alice',
            },
            {
              base_fee_mtokens: '2000',
              cltv_delta: 144,
              fee_rate: 2,
              public_key: 'bob',
            },
          ],
        },
        {
          capacity: 3000,
          destination: 'charlie',
          id: '2',
          policies: [
            {
              base_fee_mtokens: '3000',
              cltv_delta: 144,
              fee_rate: 3,
              public_key: 'charlie',
            },
            {
              base_fee_mtokens: '9999',
              cltv_delta: 999,
              fee_rate: 9,
              public_key: 'bob',
            },
          ],
        },
      ],
    },
    description: 'Mapping channels to hops results in a hops list',
    expected: [
      {
        base_fee_mtokens: '1000',
        channel_capacity: 1000,
        channel_id: '0',
        cltv_delta: 144,
        fee_rate: 1,
        public_key: 'alice',
      },
      {
        base_fee_mtokens: '2000',
        channel_capacity: 2000,
        channel_id: '1',
        cltv_delta: 144,
        fee_rate: 2,
        public_key: 'bob',
      },
      {
        base_fee_mtokens: '3000',
        channel_capacity: 3000,
        channel_id: '2',
        cltv_delta: 144,
        fee_rate: 3,
        public_key: 'charlie',
      },
    ],
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end}) => {
    const {hops} = hopsFromChannels(args);

    deepIs(hops, expected, 'Hops returned as expected');

    return end();
  });
});

