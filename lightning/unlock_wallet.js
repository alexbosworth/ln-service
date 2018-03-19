/** Unlock the wallet

  {
    lnd: <LND GRPC API Object>
    password: <Password String>
  }
*/
module.exports = ({lnd, password}, cbk) => {
  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  if (!password) {
    return cbk([500, 'ExpectedUnlockPassword']);
  }

  return lnd.unlockWallet({wallet_password: Buffer.from(password)}, err => {
    if (!!err) {
      return cbk([500, 'UnexpectedUnlockWalletErr', err]);
    }

    return cbk();
  });
};

