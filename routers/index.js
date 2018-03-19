const addressesRouter = require('./addresses');
const authorizer = require('./authorizer');
const balanceRouter = require('./balance');
const channelsRouter = require('./channels');
const connectionsRouter = require('./connections');
const cryptoRouter = require('./crypto');
const exchangeRouter = require('./exchange');
const historyRouter = require('./history');
const invoicesRouter = require('./invoices');
const networkInfoRouter = require('./network_info');
const paymentsRouter = require('./payments');
const peersRouter = require('./peers');
const purchasedRouter = require('./purchased');
const transactionsRouter = require('./transactions');
const walletInfoRouter = require('./wallet_info');

module.exports = {
  addressesRouter,
  authorizer,
  balanceRouter,
  channelsRouter,
  connectionsRouter,
  cryptoRouter,
  exchangeRouter,
  historyRouter,
  invoicesRouter,
  networkInfoRouter,
  paymentsRouter,
  peersRouter,
  purchasedRouter,
  transactionsRouter,
  walletInfoRouter,
};

