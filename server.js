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

const {LNSERVICE_LND_DATADIR} = process.env;
const {PORT} = process.env;

const httpsPort = 18554;
const lndGrpcHost = 'localhost:10009';
const logFormat = ':method :url :status - :response-time ms - :user-agent';
const port = PORT || 10553;

const app = express();
const lnd = lightningDaemon({host: lndGrpcHost, path: './config/grpc.proto'});

const server = app
  .listen(port, () => console.log(`Listening HTTP on port: ${port}`))
  .on('error', e => console.log('Listen error', e));

const [cert, key] = ['cert', 'key']
  .map(n => `${LNSERVICE_LND_DATADIR}/tls.${n}`)
  .map(n => readFileSync(n, 'utf8'));

const httpsServer = https.createServer({cert, key}, app);

const wss = [
  new WebSocketServer({server, verifyClient}),
  new WebSocketServer({server: httpsServer, verifyClient}),
];

httpsServer.listen(httpsPort);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  if (req.method === 'OPTIONS') {
    res.json(true);
  } else {
    next();
  }
});

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

if (process.env.NODE_ENV !== 'production') {
  walnut.check(require('./package'));
}
