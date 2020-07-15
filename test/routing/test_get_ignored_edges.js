const {test} = require('@alexbosworth/tap');

const {getIgnoredEdges} = require('./../../routing');

const makeKey = n => Buffer.alloc(33, n).toString('hex');

const tests = [
  {
    args: {},
    description: 'An ignore array is required',
    error: [400, 'ExpectedIgnoreArrayToGetIgnoreEdges'],
  },
  {
    args: {ignores: [undefined]},
    description: 'Ignore edges must be edges',
    error: [400, 'ExpectedIgnoreArrayElementsToGetIgnoreEdges'],
  },
  {
    args: {ignores: [{channel: '1x1x1'}]},
    description: 'Ignore edges must have directionality',
    error: [400, 'ExpectedPublicKeyDirectionalityInIgnoredEdge'],
  },
  {
    args: {ignores: [{channel: '1x1x1', to_public_key: 'b'}]},
    description: 'Lnd is required',
    error: [400, 'ExpectedAuthenticatedLndToGetIgnoredEdges'],
  },
  {
    args: {
      ignores: [
        {
          channel: '0x0x12345',
          to_public_key: makeKey(2),
        },
        {
          channel: '0x0x12345',
          from_public_key: makeKey(1),
        },
        {
          channel: '0x0x12345',
          from_public_key: makeKey(1),
          to_public_key: makeKey(2),
        },
        {
          from_public_key: makeKey(3),
        },
      ],
      lnd: {
        default: {
          getChanInfo: ({}, cbk) => {
            return cbk(null, {
              capacity: 1,
              chan_point: `${Buffer.alloc(32).toString('hex')}:0`,
              channel_id: '12345',
              last_update: Math.round(Date.now() / 1000),
              node1_policy: {
                disabled: false,
                fee_base_msat: '1',
                fee_rate_milli_msat: '1',
                last_update: Math.round(Date.now() / 1000),
                max_htlc_msat: '1',
                min_htlc: '1',
                time_lock_delta: 1,
              },
              node1_pub: makeKey(1),
              node2_policy: {
                disabled: false,
                fee_base_msat: '1',
                fee_rate_milli_msat: '1',
                last_update: Math.round(Date.now() / 1000),
                max_htlc_msat: '1',
                min_htlc: '1',
                time_lock_delta: 1,
              },
              node2_pub: makeKey(2),
            });
          },
        },
      },
    },
    description: 'Ignores filled out',
    expected: {
      ignores: [
        {
          channel: '0x0x12345',
          from_public_key: makeKey(1),
          to_public_key: makeKey(2),
        },
        {
          channel: '0x0x12345',
          from_public_key: makeKey(1),
          to_public_key: makeKey(2),
        },
        {
          channel: '0x0x12345',
          from_public_key: makeKey(1),
          to_public_key: makeKey(2),
        },
        {
          from_public_key: makeKey(3),
          to_public_key: undefined,
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, rejects}) => {
    if (!!error) {
      rejects(getIgnoredEdges(args), error, 'Got expected error');
    } else {
      deepIs(await getIgnoredEdges(args), expected, 'Got ignored edges');
    }

    return end();
  });
});
