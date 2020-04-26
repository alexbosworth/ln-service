const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const method = 'changePassword';
const utf8 = 'utf8';

/** Change wallet password

  Requires locked LND and unauthenticated LND connection

  {
    current_password: <Current Password String>
    lnd: <Unauthenticated LND API Object>
    new_password: <New Password String>
  }

  @returns via cbk or Promise
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.current_password) {
          return cbk([400, 'ExpectedCurrentPasswordToChangePassword']);
        }

        if (!isLnd({method, lnd: args.lnd, type: 'unlocker'})) {
          return cbk([400, 'ExpectedUnauthenticatedLndGrpcToChangePassword']);
        }

        if (!args.new_password) {
          return cbk([400, 'ExpectedNewPasswordForChangePasswordRequest']);
        }

        return cbk();
      },

      // Use the old password to change to the new password
      changePassword: ['validate', ({}, cbk) => {
        return args.lnd.unlocker.changePassword({
          current_password: Buffer.from(args.current_password, utf8),
          new_password: Buffer.from(args.new_password, utf8),
        },
        err => {
          if (!!err) {
            return cbk([503, 'FailedToChangeLndPassword', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
