const {test} = require('tap');

const {htlcAsPayment} = require('./../../invoices');

const makeHtlc = overrides => {
  const htlc = {
    accept_height: 1,
    accept_time: '1',
    amt_msat: '1',
    chan_id: '1',
    custom_records: {
      '\u0010\u0000\u0000\u0000\u0000\u0000\u0000\u0000': Buffer.alloc(1, 1),
    },
    expiry_height: 1,
    htlc_index: '1',
    resolve_time: '1',
    state: 'SETTLED',
  };

  Object.keys(overrides).forEach(k => htlc[k] = overrides[k]);

  return htlc;
};

const tests = [
  {
    args: makeHtlc({accept_height: undefined}),
    description: 'Accept height is needed',
    error: 'ExpectedAcceptHeightInResponseHtlc',
  },
  {
    args: makeHtlc({accept_time: undefined}),
    description: 'Accept time is needed',
    error: 'ExpectedAcceptTimeInResponseHtlc',
  },
  {
    args: makeHtlc({amt_msat: undefined}),
    description: 'Amount is needed',
    error: 'ExpectedPaymentAmountInResponseHtlc',
  },
  {
    args: makeHtlc({chan_id: undefined}),
    description: 'Chan id is needed',
    error: 'ExpectedChannelIdInResponseHtlc',
  },
  {
    args: makeHtlc({custom_records: undefined}),
    description: 'Custom records are needed',
    error: 'ExpectedCustomRecordsInResponseHtlc',
  },
  {
    args: makeHtlc({expiry_height: undefined}),
    description: 'Expiry height is needed',
    error: 'ExpectedHtlcExpiryHeightInResponseHtlc',
  },
  {
    args: makeHtlc({htlc_index: undefined}),
    description: 'HTLC index is required',
    error: 'ExpectedHtlcIndexInResponseHtlc',
  },
  {
    args: makeHtlc({resolve_time: undefined}),
    description: 'Resolve time is required',
    error: 'ExpectedResolveTimeInResponseHtlc',
  },
  {
    args: makeHtlc({state: undefined}),
    description: 'Htlc state is required',
    error: 'ExpectedHtlcStateInResponseHtlc',
  },
  {
    args: makeHtlc({mpp_total_amt_msat: '0'}),
    description: 'HTLC mapped to payment',
    expected: {
      canceled_at: null,
      confirmed_at: '1970-01-01T00:00:01.000Z',
      created_at: '1970-01-01T00:00:01.000Z',
      created_height: 1,
      in_channel: '0x0x1',
      is_canceled: false,
      is_confirmed: true,
      is_held: false,
      messages: [{type: '16', value: '01'}],
      mtokens: '1',
      pending_index: undefined,
      timeout: 1,
      tokens: 0,
      total_mtokens: undefined,
    },
  },
  {
    args: makeHtlc({amt_msat: '0', state: 'CANCELED'}),
    description: 'Canceled HTLC mapped to payment',
    expected: {
      canceled_at: '1970-01-01T00:00:01.000Z',
      confirmed_at: null,
      created_at: '1970-01-01T00:00:01.000Z',
      created_height: 1,
      in_channel: '0x0x1',
      is_canceled: true,
      is_confirmed: false,
      is_held: false,
      messages: [{type: '16', value: '01'}],
      mtokens: '0',
      pending_index: undefined,
      timeout: 1,
      tokens: 0,
      total_mtokens: undefined,
    },
  },
  {
    args: makeHtlc({mpp_total_amt_msat: '1', state: 'ACCEPTED'}),
    description: 'Accepted HTLC mapped to payment',
    expected: {
      canceled_at: null,
      confirmed_at: null,
      created_at: '1970-01-01T00:00:01.000Z',
      created_height: 1,
      in_channel: '0x0x1',
      is_canceled: false,
      is_confirmed: false,
      is_held: true,
      messages: [{type: '16', value: '01'}],
      mtokens: '1',
      pending_index: 1,
      timeout: 1,
      tokens: 0,
      total_mtokens: '1',
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepEqual, end, throws}) => {
    if (!!error) {
      throws(() => htlcAsPayment(args), new Error(error), 'Got expected err');
    } else {
      deepEqual(htlcAsPayment(args), expected, 'HTLC mapped as payment');
    }

    return end();
  });
});
