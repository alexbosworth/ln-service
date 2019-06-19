const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

/** Delete all records of payments

  {
    lnd: <Authenticated LND gRPC API Object>
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.default) {
          return cbk([400, 'ExpectedAuthenticatedLndToDeleteAllPayments']);
        }

        return cbk();
      },

      // Delete all payments
      deletePayments: ['validate', ({}, cbk) => {
        return lnd.default.deleteAllPayments({}, err => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorDeletingAllPayments', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
