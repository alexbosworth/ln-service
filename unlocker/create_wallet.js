const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const utf8 = 'utf8';

/** Create a wallet

  Requires unlocked lnd and unauthenticated LND API Object

  {
    lnd: <Unauthenticated LND API Object>
    [passphrase]: <AEZSeed Encryption Passphrase String>
    password: <Wallet Password String>
    seed: <Seed Mnemonic String>
  }

  @returns via cbk or Promise
*/
module.exports = ({lnd, passphrase, password, seed}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({lnd, method: 'initWallet', type: 'unlocker'})) {
          return cbk([400, 'ExpectedLndForWalletCreation']);
        }

        if (!password) {
          return cbk([400, 'ExpectedWalletPasswordForWalletCreation']);
        }

        if (!seed) {
          return cbk([400, 'ExpectedSeedMnemonicForWalletCreation']);
        }

        return cbk();
      },

      // Create wallet
      createWallet: ['validate', ({}, cbk) => {
        const pass = !passphrase ? undefined : Buffer.from(passphrase, utf8);

        return lnd.unlocker.initWallet({
          aezeed_passphrase: pass,
          cipher_seed_mnemonic: seed.split(' '),
          wallet_password: Buffer.from(password, utf8),
        },
        err => {
          if (!!err) {
            return cbk([503, 'UnexpectedInitWalletError', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
