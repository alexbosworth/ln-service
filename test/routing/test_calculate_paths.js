const {test} = require('tap');

const {calculatePaths} = require('./../../');
const {graphAlpha} = require('./fixtures');

const tests = [
  // Multiple paths are returned
  {
    args: {
      channels: graphAlpha.channels,
      end: 'ELLEN',
      mtokens: 1000 * 1e3,
      start: 'ALICE',
    },
    description: 'Both low cost and high cost paths are returned',
    expected: {
      paths: [
        {
          hops: [
            {
              base_fee_mtokens: '1000',
              channel: 'ALICExCAROL',
              channel_capacity: 10000,
              cltv_delta: 1,
              fee_rate: 1,
              public_key: 'CAROL',
            },
            {
              base_fee_mtokens: '1000',
              channel: 'CAROLxDAVID',
              channel_capacity: 10000,
              cltv_delta: 1,
              fee_rate: 1,
              public_key: 'DAVID',
            },
            {
              base_fee_mtokens: '1000',
              channel: 'DAVIDxELLEN',
              channel_capacity: 10000,
              cltv_delta: 1,
              fee_rate: 1,
              public_key: 'ELLEN',
            },
          ],
        },
        {
          hops: [
            {
              base_fee_mtokens: '1000',
              channel: 'ALICExBOB',
              channel_capacity: 10000,
              cltv_delta: 1,
              fee_rate: 1,
              public_key: 'BOB',
            },
            {
              base_fee_mtokens: '1',
              channel: 'BOBxELLEN',
              channel_capacity: 10000,
              cltv_delta: 1,
              fee_rate: 1,
              public_key: 'ELLEN',
            },
          ],
        },
      ],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepEqual, end}) => {
    const {paths} = calculatePaths(args);

    deepEqual(paths, expected.paths, 'Hops are calculated');

    return end();
  });
});
