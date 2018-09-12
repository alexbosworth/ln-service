/** Unlock the wallet

  {
    lnd: <LND GRPC API Object>
    password: <Password String>
  }
*/
module.exports = ({lnd, password}, cbk) => {
  if (!lnd) {
    return cbk([400, 'ExpectedLnd']);
  }

  if (!password) {
    return cbk([400, 'ExpectedUnlockPassword']);
  }

  return lnd.unlockWallet({wallet_password: Buffer.from(password)}, err => {
    if (!!err && err.details === 'invalid passphrase for master public key') {
      return cbk([401, 'InvalidWalletUnlockPassword']);
    }

    if (!!err) {
      return cbk([503, 'UnexpectedUnlockWalletErr', err]);
    }

    return cbk();
  });
};

