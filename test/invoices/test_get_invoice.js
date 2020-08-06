const {test} = require('tap');

const {getInvoice} = require('./../../');

const tests = [
  {
    args: {},
    description: 'An id of an invoice to get is required',
    error: [400, 'ExpectedIdToGetInvoiceDetails'],
  },
  {
    args: {id: Buffer.alloc(32).toString('hex')},
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetInvoiceDetails'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async ({deepEqual, end, rejects}) => {
    if (!!error) {
      await rejects(getInvoice(args), error, 'Got expected err');
    } else {
      await getInvoice(args);
    }

    return end();
  });
});
