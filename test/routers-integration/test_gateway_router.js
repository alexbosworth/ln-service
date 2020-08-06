const {once} = require('events');
const {readFileSync} = require('fs');
const {Writable} = require('stream');

const {getPortPromise} = require('portfinder');
const {lndGateway} = require('lightning');
const request = require('@alexbosworth/request');
const {test} = require('tap');
const websocket = require('ws');

const {generateBlocks} = require('./../macros');
const {getWalletInfo} = require('./../../');
const {grpcProxyServer} = require('./../../routers');
const {spawnLnd} = require('./../macros');
const {subscribeToBlocks} = require('./../../');
const {waitForTermination} = require('./../macros');

const all = promise => Promise.all(promise);
const log = () => {};

// The gateway router should allow proxying requests to LND
test('Gateway proxies requests to LND', async ({end, equal}) => {
  const path = '/v0/grpc/';
  const port = await getPortPromise({port: 8050});
  const spawned = await spawnLnd({});

  const cert = spawned.lnd_cert;
  const macaroon = spawned.lnd_macaroon;
  const socket = spawned.lnd_socket;

  const {app, server, wss} = grpcProxyServer({
    cert,
    log,
    path,
    port,
    socket,
    stream: new Writable({write: (chunk, encoding, cbk) => cbk()}),
  });

  const {lnd} = lndGateway({
    macaroon,
    request,
    websocket,
    url: `http://localhost:${port}${path}`,
  });

  const sub = subscribeToBlocks({lnd});

  sub.on('error', err => {});

  // Generate a block and wait for the block event to be emitted
  const [, [{height}]] = await all([
    generateBlocks({
      cert: readFileSync(spawned.chain_rpc_cert),
      count: 1,
      host: spawned.listen_ip,
      pass: spawned.chain_rpc_pass,
      port: spawned.chain_rpc_port,
      user: spawned.chain_rpc_user,
    }),
    once(sub, 'block'),
  ]);

  const gotInfo = await getWalletInfo({lnd});

  equal(height, gotInfo.current_block_height, 'Got subscribe data');
  equal(gotInfo.public_key, spawned.public_key, 'Got request data');

  wss.close();

  server.close();

  await all([server, wss].map(n => once(n, 'close')));

  spawned.kill();

  await waitForTermination({lnd: spawned.lnd});

  return end();
});
