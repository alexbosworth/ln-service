const {test} = require('tap');

const {htlcAsPayment} = require('./../../invoices');

const tests = [
  {
    args: {},
    description: 'Accept height is needed',
    error: 'ExpectedAcceptHeightInResponseHtlc',
  },
  {
    args: {accept_height: 1},
    description: 'Accept time is needed',
    error: 'ExpectedAcceptTimeInResponseHtlc',
  },
  {
    args: {accept_height: 1, accept_time: 1},
    description: 'Amount is needed',
    error: 'ExpectedPaymentAmountInResponseHtlc',
  },
  {
    args: {accept_height: 1, accept_time: '1', amt_msat: '1'},
    description: 'Chan id is needed',
    error: 'ExpectedChannelIdInResponseHtlc',
  },
  {
    args: {accept_height: 1, accept_time: '1', amt_msat: '1', chan_id: '1'},
    description: 'Expiry height is needed',
    error: 'ExpectedHtlcExpiryHeightInResponseHtlc',
  },
  {
    args: {
      accept_height: 1,
      accept_time: '1',
      amt_msat: '1',
      chan_id: '1',
      expiry_height: 1,
    },
    description: 'HTLC index is required',
    error: 'ExpectedHtlcIndexInResponseHtlc',
  },
  {
    args: {
      accept_height: 1,
      accept_time: '1',
      amt_msat: '1',
      chan_id: '1',
      expiry_height: 1,
      htlc_index: '1',
    },
    description: 'Resolve time is required',
    error: 'ExpectedResolveTimeInResponseHtlc',
  },
  {
    args: {
      accept_height: 1,
      accept_time: '1',
      amt_msat: '1',
      chan_id: '1',
      expiry_height: 1,
      htlc_index: '1',
      resolve_time: '1',
    },
    description: 'Resolve time is required',
    error: 'ExpectedHtlcStateInResponseHtlc',
  },
  {
    args: {
      accept_height: 1,
      accept_time: '1',
      amt_msat: '1',
      chan_id: '1',
      expiry_height: 1,
      htlc_index: '1',
      resolve_time: '1',
      state: 'SETTLED',
    },
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
      mtokens: '1',
      pending_index: undefined,
      timeout: 1,
      tokens: 0,
      total_mtokens: undefined,
    },
  },
  {
    args: {
      accept_height: 1,
      accept_time: '1',
      amt_msat: '1',
      chan_id: '1',
      expiry_height: 1,
      htlc_index: '1',
      resolve_time: '1',
      state: 'CANCELED',
    },
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
      mtokens: '1',
      pending_index: undefined,
      timeout: 1,
      tokens: 0,
      total_mtokens: undefined,
    },
  },
  {
    args: {
      accept_height: 1,
      accept_time: '1',
      amt_msat: '1',
      chan_id: '1',
      expiry_height: 1,
      htlc_index: '1',
      resolve_time: '0',
      state: 'ACCEPTED',
    },
    description: 'Canceled HTLC mapped to payment',
    expected: {
      canceled_at: null,
      confirmed_at: null,
      created_at: '1970-01-01T00:00:01.000Z',
      created_height: 1,
      in_channel: '0x0x1',
      is_canceled: false,
      is_confirmed: false,
      is_held: true,
      mtokens: '1',
      pending_index: 1,
      timeout: 1,
      tokens: 0,
      total_mtokens: undefined,
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
