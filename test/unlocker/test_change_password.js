const {test} = require('tap');

const {changePassword} = require('./../../');

const tests = [
  {
    args: {},
    description: 'The current password is required',
    error: [400, 'ExpectedCurrentPasswordToChangePassword'],
  },
  {
    args: {current_password: 'password'},
    description: 'LND is required',
    error: [400, 'ExpectedUnauthenticatedLndGrpcToChangePassword'],
  },
  {
    args: {
      current_password: 'password',
      lnd: {unlocker: {changePassword: ({}, cbk) => cbk()}},
    },
    description: 'LND is required',
    error: [400, 'ExpectedNewPasswordForChangePasswordRequest'],
  },
  {
    args: {
      current_password: 'password',
      lnd: {unlocker: {changePassword: ({}, cbk) => cbk('err')}},
      new_password: 'new_password',
    },
    description: 'Errors are passed back',
    error: [503, 'FailedToChangeLndPassword', {err: 'err'}],
  },
  {
    args: {
      current_password: 'password',
      lnd: {unlocker: {changePassword: ({}, cbk) => cbk(null, {})}},
      new_password: 'new_password',
    },
    description: 'Password is changed',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => changePassword(args), error, 'Got expected error');
    } else {
      await changePassword(args);
    }

    return end();
  });
});
