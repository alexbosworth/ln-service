const {join} = require('path');
const {readFileSync} = require('fs');
const {spawn} = require('child_process');

const asyncAuto = require('async/auto');
const {ECPair} = require('bitcoinjs-lib');
const openPortFinder = require('openport');
const {networks} = require('bitcoinjs-lib');
const {payments} = require('bitcoinjs-lib');

const {fromPublicKey} = ECPair;
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

    // Find open ports for the listen and RPC ports
    getPorts: cbk => {
      const count = 2;
      const startingPort = 4567 + Math.round(Math.random() * 1000);

      return openPortFinder.find({count, startingPort}, (err, ports) => {
        if (!!err) {
          return cbk([500, 'FailedToFindOpenPorts', err]);
        }

        const [listen, rpc] = ports;

        return cbk(null, {listen, rpc});
      });
    },

    // Spin up the chain daemon
    spawnDaemon: ['validate', 'getPorts', ({getPorts}, cbk) => {
      const miningKey = Buffer.from(args.mining_public_key, 'hex');
      const network = networks.testnet;

      const pubkey = fromPublicKey(miningKey, network).publicKey;

      const daemon = spawn(args.daemon, [
        '--datadir', args.dir,
        '--listen', `${localhost}:${getPorts.listen}`,
        '--logdir', args.dir,
        '--miningaddr', p2pkh({network, pubkey}).address,
        (!args.is_tls ? '--notls' : null),
        '--regtest',
        '--relaynonstd',
        '--rpccert', join(args.dir, 'rpc.cert'),
        '--rpckey', join(args.dir, 'rpc.key'),
        '--rpclisten', `${localhost}:${getPorts.rpc}`,
        '--rpcpass', 'pass',
        '--rpcuser', 'user',
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
      listen_port: res.getPorts.listen,
      rpc_cert: join(args.dir, 'rpc.cert'),
      rpc_port: res.getPorts.rpc,
    });
  });
};

