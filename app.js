const {log} = console;

const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');
const basicAuth = require('express-basic-auth');
const bodyParser = require('body-parser');
const compress = require('compression')();
const config = require('dotenv').config();
const cors = require('cors');
const express = require('express');
const logger = require('morgan');
const walnut = require('walnut');

const {addressesRouter} = require('./routers');
const {authorizer} = require('./routers');
const {balanceRouter} = require('./routers');
const {channelsRouter} = require('./routers');
const {connectionsRouter} = require('./routers');
const {cryptoRouter} = require('./routers');
const {exchangeRouter} = require('./routers');
const {getWalletInfo} = require('./lightning');
const {historyRouter} = require('./routers');
const {invoicesRouter} = require('./routers');
const {isWalletLocked} = require('./service');
const {lightningDaemon} = require('./lightning');
const {localLnd} = require('./service');
const {networkInfoRouter} = require('./routers');
const {paymentsRouter} = require('./routers');
const {peersRouter} = require('./routers');
const {purchasedRouter} = require('./routers');
const {rowTypes} = require('./lightning');
const {subscribeToInvoices} = require('./push');
const {subscribeToTransactions} = require('./push');
const {transactionsRouter} = require('./routers');
const {unlockWallet} = require('./lightning');
const {walletInfoRouter} = require('./routers');
const {walletPasswordPrompt} = require('./service');

const app = express();
const logFormat = ':method :url :status - :response-time ms - :user-agent';
const {NODE_ENV} = process.env;
const unlockDelayMs = 1000;
const unlockerLnd = localLnd({is_unlocker: true});

if (NODE_ENV !== 'production') {
  walnut.check(require('./package'));
}

module.exports = app;

return asyncAuto({
  // Determine if the wallet is locked
  isLocked: cbk => isWalletLocked({}, cbk),

  // Get the wallet unlock password
  walletPassword: ['isLocked', async ({isLocked}, cbk) => {
    return !isLocked ? Promise.resolve() : await walletPasswordPrompt({});
  }],

  // Unlock the wallet if necessary
  unlockWallet: [
    'isLocked',
    'walletPassword',
    ({isLocked, walletPassword}, cbk) =>
  {
    // Exit early when there is no need to unlock
    if (!isLocked) {
      return cbk();
    }

    return unlockWallet({lnd: unlockerLnd, password: walletPassword}, err => {
      if (!!err) {
        return cbk(err);
      }

      return setTimeout(() => cbk(), unlockDelayMs);
    });
  }],

  // Start API server
  startServer: ['unlockWallet', ({}, cbk) => {
    const wss = [];
    const lnd = localLnd({});

    app.disable('x-powered-by');
    app.use(compress);
    app.use(cors());
    app.use(bodyParser.json());
    app.use(logger(logFormat));
    app.use(basicAuth({authorizer, authorizeAsync: true}));

    app.use('/v0/addresses', addressesRouter({lnd, log}));
    app.use('/v0/balance', balanceRouter({lnd, log}));
    app.use('/v0/channels', channelsRouter({lnd, log}));
    app.use('/v0/connections', connectionsRouter({lnd, log}));
    app.use('/v0/crypto', cryptoRouter({lnd, log}));
    app.use('/v0/exchange', exchangeRouter({log}));
    app.use('/v0/history', historyRouter({lnd, log}));
    app.use('/v0/invoices', invoicesRouter({lnd, log, wss}));
    app.use('/v0/network_info', networkInfoRouter({lnd, log}));
    app.use('/v0/payments', paymentsRouter({lnd, log, wss}));
    app.use('/v0/peers', peersRouter({lnd, log}));
    app.use('/v0/purchased', purchasedRouter({lnd, log}));
    app.use('/v0/transactions', transactionsRouter({lnd, log, wss}));
    app.use('/v0/wallet_info', walletInfoRouter({lnd, log}));

    subscribeToInvoices({lnd, log, wss});
    subscribeToTransactions({lnd, log, wss});

    app.wss = wss;
    return cbk();
  }],
},
err => {
  if (!!err) {
    return log(err);
  }

  return;
});
