const bodyParser = require('body-parser');
const compress = require('compression')();
const express = require('express');
const logger = require('morgan');
const walnut = require('walnut');

const balanceRouter = require('./routers/balance');
const channelsRouter = require('./routers/channels');
const lndGrpcInterface = require('./libs/lnd_grpc_interface');
const historyRouter = require('./routers/history');
const invoicesRouter = require('./routers/invoices');
const networkInfoRouter = require('./routers/network_info');
const payReqRouter = require('./routers/payment_request');
const peersRouter = require('./routers/peers');
const purchasedRouter = require('./routers/purchased');
const walletInfoRouter = require('./routers/wallet_info');

const lndGrpcHost = 'localhost:10009';
const logFormat = ':method :url :status - :response-time ms - :user-agent';
const port = process.env.PORT || 10553;

const app = express();
const lndGrpcApi = lndGrpcInterface('./config/grpc.proto', lndGrpcHost);

app
.listen(port, () => { console.log(`Listening on port: ${port}`); })
.on('error', (e) => { console.log('Listen error', e); });

app.disable('x-powered-by');

app.use(compress);
app.use(bodyParser.json());
app.use(logger(logFormat));

app.use('/v0/balance', balanceRouter({lnd_grpc_api: lndGrpcApi}));
app.use('/v0/channels', channelsRouter({lnd_grpc_api: lndGrpcApi}));
app.use('/v0/history', historyRouter({lnd_grpc_api: lndGrpcApi}));
app.use('/v0/invoices', invoicesRouter({lnd_grpc_api: lndGrpcApi}));
app.use('/v0/network_info', networkInfoRouter({lnd_grpc_api: lndGrpcApi}));
app.use('/v0/peers', peersRouter({lnd_grpc_api: lndGrpcApi}));
app.use('/v0/purchased', purchasedRouter({lnd_grpc_api: lndGrpcApi}));
app.use('/v0/payment_request', payReqRouter({lnd_grpc_api: lndGrpcApi}));
app.use('/v0/wallet_info', walletInfoRouter({lnd_grpc_api: lndGrpcApi}));

if (process.env.NODE_ENV !== 'production') {
  walnut.check(require('./package'));
}

