const utf8 = 'utf8';

/** Change password

  {
    current_password: <Current Password String>
    lnd: <WalletUnlocker LND GRPC API Object>
    new_password: <New Password String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.current_password) {
    return cbk([400, 'ExpectedCurrentPasswordToChangePassword']);
  }

  if (!args.lnd) {
    return cbk([400, 'ExpectedLndToChangePassword']);
  }

  if (!args.new_password) {
    return cbk([400, 'ExpectedNewPasswordForChangePasswordRequest']);
  }

  args.lnd.changePassword({
    current_password: Buffer.from(args.current_password, utf8),
    lnd: args.lnd,
    new_password: Buffer.from(args.new_password, utf8),
  },
  err => {
    if (!!err) {
      return cbk([503, 'FailedToChangeLndPassword', err]);
    }

    return cbk();
  });
};
