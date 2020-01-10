const {emitGrpcEvents} = require('lightning');
const express = require('express');
const {grpcRouter} = require('lightning');
const {Server} = require('ws');

const defaultBind = '127.0.0.1';

/** Get a gRPC proxy server

  {
    [bind]: <Bind to Address String>
    [cert]: <LND Cert Base64 String>
    log: <Log Function>
    path: <Router Path String>
    port: <Listen Port Number>
    socket: <LND Socket String>
  }
*/
module.exports = ({bind, cert, log, path, port, socket}) => {
  const app = express();

  const server = app
    .listen(port, bind || defaultBind, () => log(null, `Listening: ${port}`))
    .on('error', err => log([500, 'ListenError', err]));

  app.use(path, grpcRouter({cert, socket}));

  const wss = new Server({server});

  wss.on('connection', ws => emitGrpcEvents({cert, socket, ws}));
  wss.on('listening', () => {});

  return {app, server, wss};
};
