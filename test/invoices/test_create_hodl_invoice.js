const {test} = require('tap');

const {createHodlInvoice} = require('./../../');

const id = Buffer.alloc(32).toString('hex');

const tests = [
  {
    args: {},
    description: 'An id of the invoice is required',
    error: [400, 'ExpectedInvoiceIdForNewHodlInvoice'],
  },
  {
    args: {id: 'foo'},
    description: 'A hex id of the invoice is required',
    error: [400, 'ExpectedInvoiceIdForNewHodlInvoice'],
  },
  {
    args: {id},
    description: 'An authenticated lnd is required',
    error: [400, 'ExpectedInvoicesLndToCreateHodlInvoice'],
  },
  {
    args: {id, lnd: {}},
    description: 'An authenticated lnd with invoices methods is required',
    error: [400, 'ExpectedInvoicesLndToCreateHodlInvoice'],
  },
  {
    args: {id, lnd: {}},
    description: 'An authenticated lnd with invoices methods is required',
    error: [400, 'ExpectedInvoicesLndToCreateHodlInvoice'],
  },
  {
    args: {id, lnd: {invoices: {}}, wss: 'foo'},
    description: 'Wss argument must be an array',
    error: [400, 'ExpectedWssArrayForCreateHodlInvoice'],
  },
  {
    args: {id, lnd: {invoices: {}}, wss: []},
    description: 'Wss argument means log must also be specified',
    error: [400, 'ExpectedLogFunctionForCreateHodlInvoice'],
  },
  {
    args: {id, lnd: {invoices: {addHoldInvoice: ({}, cbk) => cbk('err')}}},
    description: 'Invoice add hodl invoice error returned',
    error: [503, 'UnexpectedAddHodlInvoiceError', {err: 'err'}],
  },
  {
    args: {id, lnd: {invoices: {addHoldInvoice: ({}, cbk) => cbk()}}},
    description: 'Invoice add hodl invoice returns no result',
    error: [503, 'ExpectedResponseWhenAddingHodlInvoice'],
  },
  {
    args: {id, lnd: {invoices: {addHoldInvoice: ({}, cbk) => cbk()}}},
    description: 'Invoice add hodl invoice returns no result',
    error: [503, 'ExpectedResponseWhenAddingHodlInvoice'],
  },
  {
    args: {
      id,
      is_fallback_included: true,
      lnd: {invoices: {addHoldInvoice: ({}, cbk) => cbk()}},
    },
    description: 'Invoice tries to create fallback address',
    error: [400, 'ExpectedLndForAddressCreation'],
  },
  {
    args: {
      id,
      is_fallback_included: true,
      is_fallback_nested: true,
      lnd: {invoices: {addHoldInvoice: ({}, cbk) => cbk()}},
    },
    description: 'Invoice tries to create fallback address',
    error: [400, 'ExpectedLndForAddressCreation'],
  },
  {
    args: {id, lnd: {invoices: {addHoldInvoice: ({}, cbk) => cbk(null, {})}}},
    description: 'Invoice add hodl invoice returns no payment request',
    error: [503, 'ExpectedPaymentRequestForCreatedInvoice'],
  },
  {
    args: {
      id,
      lnd: {
        invoices: {
          addHoldInvoice: ({}, cbk) => cbk(null, {payment_request: 'req'}),
        },
      },
    },
    description: 'Invoice add hodl invoice returns no payment request',
    expected: {
      chain_address: undefined,
      description: undefined,
      id: '0000000000000000000000000000000000000000000000000000000000000000',
      request: 'req',
      tokens: 0,
    },
  },
  {
    args: {
      id,
      cltv_delta: 1,
      expires_at: new Date().toISOString(),
      is_fallback_included: true,
      lnd: {
        default: {
          newAddress: ({}, cbk) => cbk(null, {address: 'address'}),
        },
        invoices: {
          addHoldInvoice: ({}, cbk) => cbk(null, {payment_request: 'req'}),
        },
      },
      log: () => {},
      wss: [],
    },
    description: 'Invoice add hodl invoice returns no payment request',
    expected: {
      chain_address: 'address',
      description: undefined,
      id: '0000000000000000000000000000000000000000000000000000000000000000',
      request: 'req',
      tokens: 0,
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(createHodlInvoice(args), error, 'Got expected create err');
    } else {
      const invoice = await createHodlInvoice(args);

      equal(invoice.chain_address, expected.chain_address, 'Chain address');
      equal(!!invoice.created_at, true, 'Invoice created at');
      equal(invoice.description, expected.description, 'Invoice description');
      equal(invoice.id, expected.id, 'Invoice hodl id');
      equal(invoice.request, expected.request, 'Invoice request returned');
      equal(invoice.tokens, expected.tokens, 'Invoice tokens returned');
    }

    return end();
  });
});
