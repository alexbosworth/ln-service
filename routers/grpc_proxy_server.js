const cors = require('cors');
const {emitGrpcEvents} = require('lightning');
const express = require('express');
const {grpcRouter} = require('lightning');
const logger = require('morgan');
const {Server} = require('ws');

const defaultBind = '127.0.0.1';
const logFormat = ':method :url :status - :response-time ms - :user-agent';

/** Get a gRPC proxy server

  {
    [bind]: <Bind to Address String>
    [cert]: <LND Cert Base64 String>
    log: <Log Function>
    path: <Router Path String>
    port: <Listen Port Number>
    socket: <LND Socket String>
    stream: <Log Write Stream Object>
  }

  @returns
  {
    app: <Express Application Object>
    server: <Web Server Object>
    wss: <WebSocket Server Object>
  }
*/
module.exports = ({bind, cert, log, path, port, socket, stream}) => {
  const app = express();

  const server = app
    .listen(port, () => log(null, `Listening: ${port}`))
    .on('error', err => log([500, 'ListenError', err]));

  app.use(cors());
  app.use(logger(logFormat, {stream}));

  app.use(path, grpcRouter({cert, socket}));

  const wss = new Server({server});

  wss.on('connection', ws => emitGrpcEvents({cert, socket, ws}));
  wss.on('listening', () => {});

  return {app, server, wss};
};
