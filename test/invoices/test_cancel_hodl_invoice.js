const {test} = require('tap');

const {cancelHodlInvoice} = require('./../../');

const tests = [
  {
    args: {},
    description: 'An id of an invoice is required',
    error: [400, 'ExpectedIdOfInvoiceToCancel'],
  },
  {
    args: {id: 'z'},
    description: 'A hex id of an invoice is required',
    error: [400, 'ExpectedIdOfInvoiceToCancel'],
  },
  {
    args: {id: '00'},
    description: 'An lnd grpc API object is required',
    error: [400, 'ExpectedInvoicesLndGrpcApiToCancelHodlInvoice'],
  },
  {
    args: {id: '00', lnd: {}},
    description: 'An lnd grpc API object is required',
    error: [400, 'ExpectedInvoicesLndGrpcApiToCancelHodlInvoice'],
  },
  {
    args: {id: '00', lnd: {invoices: {}}},
    description: 'An lnd invoices grpc API object is required',
    error: [400, 'ExpectedInvoicesLndGrpcApiToCancelHodlInvoice'],
  },
  {
    args: {id: '00', lnd: {invoices: {cancelInvoice: ({}, cbk) => cbk('e')}}},
    description: 'Errors from cancel invoice are passed back',
    error: [503, 'UnexpectedErrorCancelingHodlInvoice', {err: 'e'}],
  },
  {
    args: {id: '00', lnd: {invoices: {cancelInvoice: ({}, cbk) => cbk()}}},
    description: 'Canceling an invoice returns no error',
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async ({deepEqual, end, rejects}) => {
    if (!!error) {
      rejects(cancelHodlInvoice(args), error, 'Got expected err');
    } else {
      await cancelHodlInvoice(args);
    }

    return end();
  });
});
