/** Create a wallet

  {
    lnd: <LND GRPC API Object>
    [passphrase]: <Seed Passphrase String>
    password: <Wallet Password String>
    seed: <Seed Mnemonic String>
  }
*/
module.exports = ({lnd, passphrase, password, seed}, cbk) => {
  if (!lnd) {
    return cbk([400, 'ExpectedLndForWalletCreation']);
  }

  if (!password) {
    return cbk([400, 'ExpectedWalletPasswordForWalletCreation']);
  }

  if (!seed) {
    return cbk([400, 'ExpectedSeedMnemonicForWalletCreation']);
  }

  return lnd.initWallet({
    aezeed_passphrase: !passphrase ? undefined : Buffer.from(passphrase),
    cipher_seed_mnemonic: seed.split(' '),
    wallet_password: Buffer.from(password),
  },
  err => {
    if (!!err) {
      return cbk([503, 'UnexpectedUnlockWalletErr', err]);
    }

    return cbk();
  });
};

