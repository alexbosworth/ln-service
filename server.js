#!/usr/bin/env node

const httpsPort = 18554;
const {LNSERVICE_LND_DIR} = process.env;
const {join} = require('path');
const {readFileSync} = require('fs');
const WebSocketServer = require('ws').Server;
const {verifyClient} = require('./push');
const {log} = console;

/**
 * Module dependencies.
 */

const app = require('./app');
const debug = require('debug')('adapter:server');
const http = require('http');
const https = require('https');

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '10553');
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = app
  .listen(port, () => log(null, `Listening HTTP on port: ${port}`))
  .on('error', err => log([500, 'ListenError', err]));

const [cert, key] = ['cert', 'key']
  .map(extension => join(LNSERVICE_LND_DIR, `tls.${extension}`))
  .map(n => readFileSync(n, 'utf8'));

const httpsServer = https.createServer({cert, key}, app);

httpsServer.listen(httpsPort);

const wss = [
  new WebSocketServer({server, verifyClient}),
  new WebSocketServer({server: httpsServer, verifyClient})
];

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// });
/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
