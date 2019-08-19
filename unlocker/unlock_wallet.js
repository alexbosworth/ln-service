const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const invalidPasswordError = 'invalid passphrase for master public key';

/** Unlock the wallet

  {
    lnd: <Unauthenticated LND gRPC API Object>
    password: <Wallet Password String>
  }

  @returns via cbk or Promise
*/
module.exports = ({lnd, password}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.unlocker || !lnd.unlocker.unlockWallet) {
          return cbk([400, 'ExpectedLndWhenUnlockingWallet']);
        }

        if (!password) {
          return cbk([400, 'ExpectedUnlockPassword']);
        }

        return cbk();
      },

      // Unlock
      unlock: ['validate', ({}, cbk) => {
        return lnd.unlocker.unlockWallet({
          wallet_password: Buffer.from(password, 'utf8'),
        },
        err => {
          if (!!err && err.details === invalidPasswordError) {
            return cbk([401, 'InvalidWalletUnlockPassword']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedUnlockWalletErr', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
