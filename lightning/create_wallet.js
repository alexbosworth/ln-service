const utf8 = 'utf8';

/** Create a wallet

  {
    lnd: <LND GRPC API Object>
    [passphrase]: <Seed Passphrase String>
    password: <Wallet Password String>
    seed: <Seed Mnemonic String>
  }
*/
module.exports = ({lnd, passphrase, password, seed}, cbk) => {
  if (!lnd || !lnd.initWallet) {
    return cbk([400, 'ExpectedLndForWalletCreation']);
  }

  if (!password) {
    return cbk([400, 'ExpectedWalletPasswordForWalletCreation']);
  }

  if (!seed) {
    return cbk([400, 'ExpectedSeedMnemonicForWalletCreation']);
  }

  return lnd.initWallet({
    aezeed_passphrase: !passphrase ? undefined : Buffer.from(passphrase, utf8),
    cipher_seed_mnemonic: seed.split(' '),
    wallet_password: Buffer.from(password, utf8),
  },
  err => {
    if (!!err) {
      return cbk([503, 'UnexpectedUnlockWalletErr', err]);
    }

    return cbk();
  });
};

