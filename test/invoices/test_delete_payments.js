const {test} = require('tap');

const {deletePayments} = require('./../../');

const tests = [
  {
    args: {},
    description: 'An authenticated lnd is required to delete payments',
    error: [400, 'ExpectedAuthenticatedLndToDeleteAllPayments'],
  },
  {
    args: {lnd: {}},
    description: 'An lnd with default methods is required',
    error: [400, 'ExpectedAuthenticatedLndToDeleteAllPayments'],
  },
  {
    args: {lnd: {default: {deleteAllPayments: ({}, cbk) => cbk('err')}}},
    description: 'An error deleting is reported',
    error: [503, 'UnexpectedErrorDeletingAllPayments', {err: 'err'}],
  },
  {
    args: {lnd: {default: {deleteAllPayments: ({}, cbk) => cbk()}}},
    description: 'Successful deletion of all past payments',
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => deletePayments(args), error, 'Got expected error');
    } else {
      await deletePayments(args);
    }

    return end();
  });
});
