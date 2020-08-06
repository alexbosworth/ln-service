const {test} = require('tap');

const {unlockWallet} = require('./../../');

const details = 'invalid passphrase for master public key';

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndWhenUnlockingWallet'],
  },
  {
    args: {lnd: {unlocker: {unlockWallet: ({}, cbk) => cbk()}}},
    description: 'Password is required',
    error: [400, 'ExpectedUnlockPassword'],
  },
  {
    args: {
      lnd: {unlocker: {unlockWallet: ({}, cbk) => cbk({details})}},
      password: 'password',
    },
    description: 'Valid password is required',
    error: [401, 'InvalidWalletUnlockPassword'],
  },
  {
    args: {
      lnd: {unlocker: {unlockWallet: ({}, cbk) => cbk('err')}},
      password: 'password',
    },
    description: 'Errors are passed along',
    error: [503, 'UnexpectedUnlockWalletErr', {err: 'err'}],
  },
  {
    args: {
      lnd: {unlocker: {unlockWallet: ({}, cbk) => cbk()}},
      password: 'password',
    },
    description: 'No errors means the wallet is unlocked',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => unlockWallet(args), error, 'Got expected error');
    } else {
      await unlockWallet(args);
    }

    return end();
  });
});
