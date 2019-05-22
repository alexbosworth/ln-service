const utf8 = 'utf8';

/** Create a wallet

  {
    lnd: <Unauthenticated LND gRPC API Object>
    [passphrase]: <AEZSeed Encryption Passphrase String>
    password: <Wallet Password String>
    seed: <Seed Mnemonic String>
  }
*/
module.exports = ({lnd, passphrase, password, seed}, cbk) => {
  if (!lnd || !lnd.unlocker || !lnd.unlocker.initWallet) {
    return cbk([400, 'ExpectedLndForWalletCreation']);
  }

  if (!password) {
    return cbk([400, 'ExpectedWalletPasswordForWalletCreation']);
  }

  if (!seed) {
    return cbk([400, 'ExpectedSeedMnemonicForWalletCreation']);
  }

  return lnd.unlocker.initWallet({
    aezeed_passphrase: !passphrase ? undefined : Buffer.from(passphrase, utf8),
    cipher_seed_mnemonic: seed.split(' '),
    wallet_password: Buffer.from(password, utf8),
  },
  err => {
    if (!!err) {
      return cbk([503, 'UnexpectedUnlockWalletError', {err}]);
    }

    return cbk();
  });
};
