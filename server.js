const basicAuth = require('express-basic-auth');
const bodyParser = require('body-parser');
const compress = require('compression')();
const express = require('express');
const http = require('http');
const https = require('https');
const logger = require('morgan');
const {readFileSync} = require('fs');
const walnut = require('walnut');
const WebSocketServer = require('ws').Server;

const {addressesRouter} = require('./routers');
const {authorizer} = require('./routers');
const {balanceRouter} = require('./routers');
const {channelsRouter} = require('./routers');
const {connectionsRouter} = require('./routers');
const {cryptoRouter} = require('./routers');
const {exchangeRouter} = require('./routers');
const {historyRouter} = require('./routers');
const {invoicesRouter} = require('./routers');
const {lightningDaemon} = require('./lightning');
const {networkInfoRouter} = require('./routers');
const {paymentsRouter} = require('./routers');
const {peersRouter} = require('./routers');
const {purchasedRouter} = require('./routers');
const {rowTypes} = require('./lightning');
const {subscribeToInvoices} = require('./push');
const {subscribeToTransactions} = require('./push');
const {transactionsRouter} = require('./routers');
const {unlockWallet} = require('./lightning');
const {verifyClient} = require('./push');
const {walletInfoRouter} = require('./routers');

const {HOME} = process.env;
const {PORT} = process.env;

const lndGrpcHost = 'localhost:10009';
const logFormat = ':method :url :status - :response-time ms - :user-agent';
const port = PORT || 10553;

const app = express();
const lnd = lightningDaemon({host: lndGrpcHost, path: './config/grpc.proto'});

const server = app
  .listen(port, () => console.log(`Listening HTTP on port: ${port}`))
  .on('error', e => console.log('Listen error', e));

const wss = new WebSocketServer({server, verifyClient});

try {
  const [cert, key] = ['cert', 'key']
    .map(n => `${HOME}/.ln-service/tls.${n}`)
    .map(n => readFileSync(n, 'utf8'));

  const httpsServer = https.createServer({cert, key}, app);

  httpsServer.listen(18554);

  console.log(`Listening HTTPS on port ${18554}`);
} catch (e) {
  console.log('Failed to start HTTPS Service');
}

app.disable('x-powered-by');
app.use(compress);
app.use(bodyParser.json());
app.use(logger(logFormat));
app.use(basicAuth({authorizer, authorizeAsync: true}));

app.use('/v0/addresses', addressesRouter({lnd}));
app.use('/v0/balance', balanceRouter({lnd}));
app.use('/v0/channels', channelsRouter({lnd}));
app.use('/v0/connections', connectionsRouter({lnd}));
app.use('/v0/crypto', cryptoRouter({lnd}));
app.use('/v0/exchange', exchangeRouter({}));
app.use('/v0/history', historyRouter({lnd}));
app.use('/v0/invoices', invoicesRouter({lnd, wss}));
app.use('/v0/network_info', networkInfoRouter({lnd}));
app.use('/v0/payments', paymentsRouter({lnd, wss}));
app.use('/v0/peers', peersRouter({lnd}));
app.use('/v0/purchased', purchasedRouter({lnd}));
app.use('/v0/transactions', transactionsRouter({lnd, wss}));
app.use('/v0/wallet_info', walletInfoRouter({lnd}));

subscribeToInvoices({lnd, wss});
subscribeToTransactions({lnd, wss});

wss.on('connection', ws => {
  ws.on('message', message => {
    // FIXME: - parse messages sent through socket
    return console.log(`received: ${message}`);
  });

  return;
});

if (process.env.NODE_ENV !== 'production') {
  walnut.check(require('./package'));
}

