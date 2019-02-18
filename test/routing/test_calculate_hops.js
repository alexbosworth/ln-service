const {test} = require('tap');

const {calculateHops} = require('./../../');

const tests = [
  // Cheapest, but longest wins
  {
    args: {
      channels: [
        {
          capacity: 10000,
          id: 'ALICExBOB',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'ALICE',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'BOB',
            },
          ],
        },
        {
          capacity: 10000,
          id: 'ALICExCAROL',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'ALICE',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'CAROL',
            },
          ],
        },
        {
          capacity: 10000,
          id: 'BOBxELLEN',
          policies: [
            {
              base_fee_mtokens: '10000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'BOB',
            },
            {
              base_fee_mtokens: '1',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '10000',
              public_key: 'ELLEN',
            },
          ],
        },
        {
          capacity: 10000,
          id: 'CAROLxDAVID',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'CAROL',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1',
              public_key: 'DAVID',
            },
          ],
        },
        {
          capacity: 10000,
          id: 'DAVIDxELLEN',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'DAVID',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'ELLEN',
            },
          ],
        },
      ],
      end: 'ELLEN',
      mtokens: 1000 * 1e3,
      nodes: ['ALICE', 'BOB', 'CAROL', 'DAVID', 'ELLEN'],
      start: 'ALICE',
    },
    description: 'A longer but cheaper path is selected',
    expected: {
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
  },

  // Direct Path
  {
    args: {
      channels: [
        {
          capacity: 10000,
          id: 'ALICExBOB',
          policies: [
            {
              base_fee_mtokens: '10',
              cltv_delta: 1,
              fee_rate: 1000,
              is_disabled: false,
              min_htlc_mtokens: '1',
              public_key: 'ALICE',
            },
            {
              base_fee_mtokens: '10',
              cltv_delta: 1,
              fee_rate: 1000,
              is_disabled: false,
              min_htlc_mtokens: '1',
              public_key: 'BOB',
            },
          ],
        },
      ],
      end: 'BOB',
      mtokens: 100,
      nodes: ['ALICE', 'BOB'],
      start: 'ALICE',
    },
    description: 'Direct path',
    expected: {
      hops: [{
        base_fee_mtokens: '10',
        channel: 'ALICExBOB',
        channel_capacity: 10000,
        cltv_delta: 1,
        fee_rate: 1000,
        public_key: 'BOB',
      }],
    },
  },

  // Disabled channel
  {
    args: {
      channels: [
        {
          capacity: 10000,
          id: 'ALICExBOB',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: true,
              min_htlc_mtokens: '1',
              public_key: 'ALICE',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: true,
              min_htlc_mtokens: '1',
              public_key: 'BOB',
            },
          ],
        },
      ],
      end: 'BOB',
      mtokens: 10000,
      nodes: ['ALICE', 'BOB'],
      start: 'ALICE',
    },
    description: 'Disabled channels cannot be traversed',
    expected: {},
  },

  // Insufficient capacity
  {
    args: {
      channels: [
        {
          capacity: 10000,
          id: 'ALICExBOB',
          policies: [
            {
              base_fee_mtokens: '10',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1',
              public_key: 'ALICE',
            },
            {
              base_fee_mtokens: '10',
              cltv_delta: 1,
              fee_rate: 1000,
              is_disabled: false,
              min_htlc_mtokens: '1',
              public_key: 'BOB',
            },
          ],
        },
      ],
      end: 'BOB',
      mtokens: 10000001,
      nodes: ['ALICE', 'BOB'],
      start: 'ALICE',
    },
    descrption: 'Insufficient capacity results in no path',
    expected: {},
  },

  // Insufficient tokens
  {
    args: {
      channels: [
        {
          capacity: 10000,
          id: 'ALICExBOB',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'ALICE',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'BOB',
            },
          ],
        },
      ],
      end: 'BOB',
      mtokens: 999,
      nodes: ['ALICE', 'BOB'],
      start: 'ALICE',
    },
    description: 'Tokens below the min htlc mtokens limit cannot route',
    expected: {},
  },

  // No connection
  {
    args: {
      channels: [
        {
          capacity: 10000,
          id: 'ALICExBOB',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'ALICE',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'BOB',
            },
          ],
        },
      ],
      end: 'CAROL',
      mtokens: 10000,
      nodes: ['ALICE', 'BOB', 'CAROL'],
      start: 'ALICE',
    },
    description: 'No connect between start and end',
    expected: {},
  },

  // Two Hop Path
  {
    args: {
      channels: [
        {
          capacity: 10000,
          id: 'ALICExBOB',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'ALICE',
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'BOB',
            },
          ],
        },
        {
          capacity: 10000,
          id: 'ALICExCAROL',
          policies: [
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'CAROL'
            },
            {
              base_fee_mtokens: '1000',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              min_htlc_mtokens: '1000',
              public_key: 'ALICE',
            },
          ],
        },
      ],
      end: 'CAROL',
      mtokens: 1000,
      nodes: ['ALICE', 'BOB', 'CAROL'],
      start: 'BOB',
    },
    description: 'A two hop path is found',
    expected: {
      hops: [
        {
          base_fee_mtokens: '1000',
          channel: 'ALICExBOB',
          channel_capacity: 10000,
          cltv_delta: 1,
          fee_rate: 1,
          public_key: 'ALICE',
        },
        {
          base_fee_mtokens: '1000',
          channel: 'ALICExCAROL',
          channel_capacity: 10000,
          cltv_delta: 1,
          fee_rate: 1,
          public_key: 'CAROL',
        },
      ],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepEqual, end}) => {
    const {hops} = calculateHops(args);

    deepEqual(hops, expected.hops, 'Hops are calculated');

    return end();
  });
});
