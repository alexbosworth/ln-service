const {join} = require('path');
const {spawn} = require('child_process');

const asyncAuto = require('async/auto');
const openPortFinder = require('portfinder');
const {networks} = require('bitcoinjs-lib');
const {payments} = require('bitcoinjs-lib');
const tinysecp = require('tiny-secp256k1');

const knownDaemons = ['btcd'];
const localhost = '127.0.0.1';
const notFoundIndex = -1;
const {p2pkh} = payments;
const rpcServerReady = /RPC.server.listening/;
const unableToStartServer = /Unable.to.start.server/;

/** Start a BTCSuite Type Daemon

  {
    daemon: <Daemon Name String>
    dir: <Data Directory String>
    [is_tls]: <Uses TLS Bool>
    mining_public_key: <Mining Public Key Hex String>
  }

  @returns
  <Daemon Object>

  @returns via cbk
  {
    daemon: <Daemon Child Process Object>
    listen_port: <Listen Port Number>
    rpc_cert: <RPC Cert Path String>
    rpc_port: <RPC Port Number>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Import ECPair library
    ecp: async () => (await import('ecpair')).ECPairFactory(tinysecp),

    // Check arguments
    validate: cbk => {
      if (knownDaemons.indexOf(args.daemon) === notFoundIndex) {
        return cbk([400, 'ExpectedBtcsuiteDaemonName', args.daemon]);
      }

      if (!args.dir) {
        return cbk([400, 'ExpectedDirectoryForDaemon']);
      }

      if (!args.mining_public_key) {
        return cbk([400, 'ExpectedMiningPublicKeyForDaemon']);
      }

      return cbk();
    },

    // Get an open P2P listen port
    listenPort: ['validate', ({}, cbk) => {
      const port = 14567 + Math.round(Math.random() * 1000);

      const stopPort = port + 1000;

      return openPortFinder.getPort({port, stopPort}, (err, port) => {
        if (!!err) {
          return cbk([500, 'FailedToFindOpenPortForListenPort', err]);
        }

        return cbk(null, port);
      });
    }],

    // Get an open RPC listen port
    rpcPort: ['listenPort', ({}, cbk) => {
      const port = 14567 + Math.round(Math.random() * 1000);

      const stopPort = port + 1000;

      return openPortFinder.getPort({port, stopPort}, (err, port) => {
        if (!!err) {
          return cbk([500, 'FailedToFindOpenPortForRpc', err]);
        }

        return cbk(null, port);
      });
    }],

    // Spin up the chain daemon
    spawnDaemon: [
      'ecp',
      'listenPort',
      'rpcPort',
      ({ecp, listenPort, rpcPort}, cbk) =>
    {
      const miningKey = Buffer.from(args.mining_public_key, 'hex');
      const network = networks.testnet;

      const pubkey = ecp.fromPublicKey(miningKey, network).publicKey;

      const daemon = spawn(args.daemon, [
        '--datadir', args.dir,
        '--debuglevel', 'trace',
        '--listen', `${localhost}:${listenPort}`,
        '--logdir', args.dir,
        '--miningaddr', p2pkh({network, pubkey}).address,
        (!args.is_tls ? '--notls' : null),
        '--regtest',
        '--relaynonstd',
        '--rpccert', join(args.dir, 'rpc.cert'),
        '--rpckey', join(args.dir, 'rpc.key'),
        '--rpclisten', `${localhost}:${rpcPort}`,
        '--rpcpass', '0k39BVOdg4uuS7qNCG2jbIXNpwU7d3Ft87PpHPPoCfk=',
        '--rpcuser', 'bitcoinrpc',
        '--txindex',
      ]);

      daemon.stdout.on('data', data => {
        if (unableToStartServer.test(`${data}`)) {
          return cbk([503, 'SpawnDaemonFailure', `${data}`, args]);
        }

        if (rpcServerReady.test(`${data}`)) {
          return cbk(null, daemon);
        }

        return;
      });
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, {
      daemon: res.spawnDaemon,
      listen_port: res.listenPort,
      rpc_cert: join(args.dir, 'rpc.cert'),
      rpc_port: res.rpcPort,
    });
  });
};
