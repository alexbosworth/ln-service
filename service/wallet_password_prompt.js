const promptly = require('promptly');

const mask = '☇';
const maxUnlockAttempts = 3;
const walletPasswordPrompt = 'Wallet is locked. Enter wallet password:';

/** Prompt for the wallet unlock password

  {}
*/
module.exports = async ({}) => {
  return await promptly.password(walletPasswordPrompt, {replace: mask});
};

