const invalidPasswordError = 'invalid passphrase for master public key';

/** Unlock the wallet

  {
    lnd: <Unauthenticated LND gRPC API Object>
    password: <Password String>
  }
*/
module.exports = ({lnd, password}, cbk) => {
  if (!lnd || !lnd.unlocker || !lnd.unlocker.unlockWallet) {
    return cbk([400, 'ExpectedLndWhenUnlockingWallet']);
  }

  if (!password) {
    return cbk([400, 'ExpectedUnlockPassword']);
  }

  const walletPassword = Buffer.from(password, 'utf8');

  return lnd.unlocker.unlockWallet({wallet_password: walletPassword}, err => {
    if (!!err && err.details === invalidPasswordError) {
      return cbk([401, 'InvalidWalletUnlockPassword']);
    }

    if (!!err) {
      return cbk([503, 'UnexpectedUnlockWalletErr', {err}]);
    }

    return cbk();
  });
};
