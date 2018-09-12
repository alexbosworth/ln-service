const getBalance = require('./get_balance');
const getConnections = require('./get_connections');
const getCurrentRate = require('./get_bitcoinaverage_current_rate');
const getHistory = require('./get_history');
const getInvoiceDetails = require('./get_invoice_details');
const isWalletLocked = require('./is_wallet_locked');
const localLnd = require('./local_lnd');
const walletPasswordPrompt = require('./wallet_password_prompt');

module.exports = {
  getBalance,
  getConnections,
  getCurrentRate,
  getHistory,
  getInvoiceDetails,
  isWalletLocked,
  localLnd,
  walletPasswordPrompt,
};

