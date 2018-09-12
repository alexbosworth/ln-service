const promptly = require('promptly');

/** Prompt for the wallet unlock password

  {}
*/
module.exports = async ({}) => {
  const mask = '☇';
  const maxUnlockAttempts = 3;
  const walletPasswordPrompt = 'Wallet is locked. Enter wallet password:';

  return await promptly.password(walletPasswordPrompt, {replace: mask});
};

