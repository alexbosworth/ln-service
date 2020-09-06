const {createServer} = require('https');

const cors = require('cors');
const {emitGrpcEvents} = require('lightning');
const express = require('express');
const {grpcRouter} = require('lightning');
const logger = require('morgan');
const {Server} = require('ws');

const defaultBind = '127.0.0.1';
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const logFormat = ':method :url :status - :response-time ms - :user-agent';
const makeServer = (app, cert, key) => createServer({cert, key}, app);

/** Get a gRPC proxy server

  {
    [bind]: <Bind to Address String>
    [cert]: <LND Cert Base64 String>
    log: <Log Function>
    path: <Router Path String>
    port: <Listen Port Number>
    socket: <LND Socket String>
    stream: <Log Write Stream Object>
    [tls]: {
      cert: <Server Cert Hex String>
      key: <Server Key Hex String>
      port: <TLS Server Port Number>
    }
  }

  @returns
  {
    app: <Express Application Object>
    [secure]: {
      server: <HTTPS Server Object>
      wss: <HTTPS WebSocket Server Object>
    }
    server: <Web Server Object>
    wss: <WebSocket Server Object>
  }
*/
module.exports = ({bind, cert, log, path, port, socket, stream, tls}) => {
  const app = express();

  const server = app
    .listen(port, () => log(null, `Listening: ${port}`))
    .on('error', err => log([500, 'ListenError', err]));

  if (!!tls) {
    const tlsCert = hexAsBuffer(tls.cert);
    const tlsKey = hexAsBuffer(tls.key);

    const secure = makeServer(app, tlsCert, tlsKey);

    const secureWss = new Server({server: secure});

    secureWss.on('connection', ws => emitGrpcEvents({cert, socket, ws}));

    secure.listen(tls.port);

    log(null, `Listening for TLS: ${tls.port}`);
  }

  app.use(cors());
  app.use(logger(logFormat, {stream}));

  app.use(path, grpcRouter({cert, socket}));

  const wss = new Server({server});

  wss.on('connection', ws => emitGrpcEvents({cert, socket, ws}));
  wss.on('listening', () => {});

  return {app, server, wss};
};
