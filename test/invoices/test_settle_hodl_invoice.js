const {test} = require('@alexbosworth/tap');

const {settleHodlInvoice} = require('./../../');

const errorLnd = err => ({invoices: {settleInvoice: ({}, cbk) => cbk(err)}});
const secret = Buffer.alloc(32).toString('hex');

const tests = [
  {
    args: {},
    description: 'An invoices rpc lnd is required',
    error: [400, 'ExpectedInvoicesLndToSettleHodlInvoice'],
  },
  {
    args: {lnd: {}},
    description: 'An invoices rpc lnd is required',
    error: [400, 'ExpectedInvoicesLndToSettleHodlInvoice'],
  },
  {
    args: {lnd: {invoices: {}}},
    description: 'An invoices rpc lnd is required',
    error: [400, 'ExpectedInvoicesLndToSettleHodlInvoice'],
  },
  {
    args: {lnd: {invoices: {settleInvoice: ({}, cbk) => cbk()}}},
    description: 'A preimage is required',
    error: [400, 'ExpectedPaymentPreimageToSettleHodlInvoice'],
  },
  {
    args: {lnd: {invoices: {settleInvoice: ({}, cbk) => cbk()}}, secret: 1},
    description: 'A preimage is required',
    error: [400, 'ExpectedPaymentPreimageToSettleHodlInvoice'],
  },
  {
    args: {lnd: {invoices: {settleInvoice: ({}, cbk) => cbk()}}, secret: '00'},
    description: 'A preimage is required',
    error: [400, 'ExpectedPaymentPreimageToSettleHodlInvoice'],
  },
  {
    args: {secret, lnd: errorLnd('err')},
    description: 'Error is returned',
    error: [503, 'UnexpectedErrorWhenSettlingHodlInvoice', {err: 'err'}],
  },
  {
    args: {secret, lnd: errorLnd({details: 'invoice still open'})},
    description: 'Invoice not accepted error is returned',
    error: [402, 'CannotSettleHtlcBeforeHtlcReceived'],
  },
  {
    args: {secret, lnd: errorLnd({details: 'unable to locate invoice'})},
    description: 'Invoice not accepted error is returned',
    error: [404, 'SecretDoesNotMatchAnyExistingHodlInvoice'],
  },
  {
    args: {
      secret,
      lnd: {
        invoices: {
          settleInvoice: ({preimage}, cbk) => {
            if (!preimage.equals(Buffer.alloc(32))) {
              return cbk('ExpectedPreimagePassedToSettleInvoice');
            }

            return cbk();
          },
        },
      },
    },
    description: 'A preimage is required',
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(settleHodlInvoice(args), error, 'Got expected create err');
    } else {
      await settleHodlInvoice(args);
    }

    return end();
  });
});
