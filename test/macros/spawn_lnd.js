const {join} = require('path');
const {readFileSync} = require('fs');
const {spawn} = require('child_process');

const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const asyncMapSeries = require('async/mapSeries');
const asyncRetry = require('async/retry');
const {ECPair} = require('bitcoinjs-lib');
const {networks} = require('bitcoinjs-lib');
const openPortFinder = require('portfinder');

const {authenticatedLndGrpc} = require('./../../');
const {createSeed} = require('./../../');
const {createWallet} = require('./../../');
const generateBlocks = require('./generate_blocks');
const {getWalletInfo} = require('./../../');
const spawnChainDaemon = require('./spawn_chain_daemon');
const {unauthenticatedLndGrpc} = require('./../../');

const adminMacaroonFileName = 'admin.macaroon';
const chainPass = 'pass';
const chainRpcCertName = 'rpc.cert';
const chainUser = 'user';
const grpcs = ['', 'Autopilot', 'Chain', 'Invoices', 'Signer', 'Wallet'];
const interval = retryCount => 50 * Math.pow(2, retryCount);
const invoiceMacaroonFileName = 'invoice.macaroon';
const {isArray} = Array;
const lightningDaemonExecFileName = 'lnd';
const lightningDaemonLogPath = 'logs/';
const lightningSeedPassphrase = 'passphrase';
const lightningTlsCertFileName = 'tls.cert';
const lightningTlsKeyFileName = 'tls.key';
const lightningWalletPassword = 'password';
const lndWalletUnlockerService = 'Unlocker';
const localhost = 'localhost';
const maxSpawnChainDaemonAttempts = 10;
const {random} = Math;
const readMacaroonFileName = 'readonly.macaroon';
const retryCreateSeedCount = 5;
const {round} = Math;
const startPortRange = 7593;
const startWalletTimeoutMs = 5500;
const times = 30;

/** Spawn an LND instance

  {
    [circular]: <Allow Circular Payments Bool>
    [keysend]: <Enable Key Send Bool>
    [seed]: <Seed Phrase String>
    [tower]: <Tower Enabled Bool>
    [watchers]: <Watchtower Client Enabled Bool>
  }

  @returns via cbk
  {
    chain_listen_port: <Chain Listen Port Number>
    chain_rpc_cert: <RPC Cert Path String>
    chain_rpc_pass: <Chain RPC Password String>
    chain_rpc_port: <RPC Port Number>
    chain_rpc_user: <Chain RPC Username String>
    kill: <Stop Function> ({}, err => {})
    listen_ip: <Listen Ip String>
    listen_port: <Listen Port Number>
    lnd: <LND GRPC API Object>
    lnd_cert: <LND Base64 Encoded TLS Certificate String>
    lnd_macaroon: <LND Base64 Encoded Authentication Macaroon String>
    lnd_socket: <LND RPC Socket String>
    mining_key: <Mining Rewards Private Key WIF Encoded String>
    public_key: <Node Public Key Hex String>
    rpc_port: <RPC Port Number>
    seed: <Node Seed Phrase String>
    socket: <LND RPC Network Socket String>
  }
*/
module.exports = ({circular, keysend, seed, tower, watchers}, cbk) => {
  return asyncAuto({
    // Find open ports for the listen, REST and RPC ports
    getPorts: cbk => {
      const ports = ['listen', 'rest', 'rpc', 'tower'];

      return asyncMapSeries(ports, (_, cbk) => {
        const port = startPortRange + round(random() * 5000);

        const stopPort = port + 20000;

        return setTimeout(() => {
          return openPortFinder.getPort({port, stopPort}, cbk);
        },
        50);
      },
      (err, ports) => {
        if (!!err || !isArray(ports) || !ports.length) {
          return cbk([500, 'FailedToFindOpenPortsWhenSpawningLnd', {err}]);
        }

        const [listen, rest, rpc, tower] = ports;

        return cbk(null, {listen, rest, rpc, tower});
      });
    },

    // Make a private key for mining rewards
    miningKey: cbk => {
      const keyPair = ECPair.makeRandom({network: networks.testnet});

      return cbk(null, {
        private_key: keyPair.toWIF(),
        public_key: keyPair.publicKey.toString('hex'),
      });
    },

    // Spawn a backing chain daemon for lnd
    spawnChainDaemon: ['miningKey', ({miningKey}, cbk) => {
      return asyncRetry(maxSpawnChainDaemonAttempts, cbk => {
        return spawnChainDaemon({
          daemon: 'btcd',
          is_tls: true,
          mining_public_key: miningKey.public_key,
        },
        cbk);
      },
      cbk);
    }],

    // Generate a block to prevent lnd from getting stuck
    generateBlock: ['spawnChainDaemon', ({spawnChainDaemon}, cbk) => {
      return asyncRetry({interval, times}, cbk => {
        try {
          return generateBlocks({
            cert: readFileSync(spawnChainDaemon.rpc_cert),
            count: 1,
            host: localhost,
            pass: chainPass,
            port: spawnChainDaemon.rpc_port,
            user: chainUser,
          },
          cbk);
        } catch (err) {
          return cbk([503, 'FailedToGenerateBlockWhenSpawningLnd', {err}]);
        }
      },
      cbk);
    }],

    // Spawn LND
    spawnLightningDaemon: [
      'generateBlock',
      'getPorts',
      'spawnChainDaemon',
      ({getPorts, spawnChainDaemon}, cbk) =>
    {
      return asyncRetry({interval, times}, cbk => {
        const {dir} = spawnChainDaemon;

        const arguments = [
          '--adminmacaroonpath', join(dir, adminMacaroonFileName),
          '--autopilot.heuristic', 'externalscore:0.5',
          '--autopilot.heuristic', 'preferential:0.5',
          '--bitcoin.active',
          '--bitcoin.chaindir', dir,
          '--bitcoin.minhtlc', '1000',
          '--bitcoin.node', 'btcd',
          '--bitcoin.regtest',
          '--btcd.dir', dir,
          '--btcd.rpccert', join(dir, chainRpcCertName),
          '--btcd.rpchost', `${localhost}:${spawnChainDaemon.rpc_port}`,
          '--btcd.rpcpass', chainPass,
          '--btcd.rpcuser', chainUser,
          '--datadir', dir,
          '--debuglevel', 'trace',
          '--externalip', `${localhost}:${getPorts.listen}`,
          '--historicalsyncinterval', '1s',
          '--invoicemacaroonpath', join(dir, invoiceMacaroonFileName),
          '--listen', `${localhost}:${getPorts.listen}`,
          '--logdir', join(dir, lightningDaemonLogPath),
          '--maxlogfilesize', 1,
          '--nobootstrap',
          '--readonlymacaroonpath', join(dir, readMacaroonFileName),
          '--restlisten', `${localhost}:${getPorts.rest}`,
          '--rpclisten', `${localhost}:${getPorts.rpc}`,
          '--tlscertpath', join(dir, lightningTlsCertFileName),
          '--tlskeypath', join(dir, lightningTlsKeyFileName),
          '--trickledelay', 1,
          '--unsafe-disconnect',
        ];

        const towerArgs = [
          '--watchtower.active',
          '--watchtower.externalip', `${localhost}:${getPorts.tower}`,
          '--watchtower.listen', `${localhost}:${getPorts.tower}`,
          '--watchtower.towerdir', dir,
        ]

        if (!!circular) {
          arguments.push('--allow-circular-route');
        }

        if (!!keysend) {
          arguments.push('--accept-keysend');
        }

        if (!!tower) {
          towerArgs.forEach(n => arguments.push(n));
        }

        if (!!watchers) {
          arguments.push('--wtclient.active');
        }

        const daemon = spawn(lightningDaemonExecFileName, arguments);

        let isFinished = false;
        let isReady = false;

        const finished = (err, res) => {
          if (!!isFinished) {
            return;
          }

          isFinished = true;

          return cbk(err, res);
        };

        daemon.stderr.on('data', data => {
          daemon.kill();
          spawnChainDaemon.daemon.kill();

          if (/unknown.flag/.test(data.toString())) {
            return finished();
          }

          return finished([503, 'FailedToStart', `${data}`.trim().split('\n')]);
        });

        daemon.stdout.on('data', data => {
          if (!isReady && /gRPC.proxy.started/.test(data+'')) {
            isReady = true;

            return finished(null, {daemon});
          };

          return;
        });
      },
      cbk);
    }],

    // Get the cert
    cert: [
      'spawnChainDaemon',
      'spawnLightningDaemon',
      ({spawnChainDaemon, spawnLightningDaemon}, cbk) =>
    {
      if (!spawnLightningDaemon) {
        return cbk([500, 'ExpectedLightningDaemon']);
      }

      const certPath = join(spawnChainDaemon.dir, lightningTlsCertFileName);

      return asyncRetry({interval, times}, cbk => {
        try {
          return cbk(null, readFileSync(certPath).toString('base64'));
        } catch (err) {
          return cbk([503, 'FailedToGetTlsCertWhenSpawningLnd', err]);
        }
      },
      cbk);
    }],

    // Get connection to the no-wallet lnd
    nonAuthenticatedLnd: [
      'cert',
      'getPorts',
      'spawnLightningDaemon',
      ({cert, getPorts}, cbk) =>
    {
      const socket = `${localhost}:${getPorts.rpc}`;

      try {
        return cbk(null, unauthenticatedLndGrpc({cert, socket}).lnd);
      } catch (err) {
        return cbk([503, 'FailedToInstantiateNonAuthenticatedLnd', {err}]);
      }
    }],

    // Create seed
    createSeed: ['nonAuthenticatedLnd', ({nonAuthenticatedLnd}, cbk) => {
      // Exit early when a seed is pre-supplied
      if (!!seed) {
        return cbk(null, {seed});
      }

      return createSeed({
        lnd: nonAuthenticatedLnd,
        passphrase: lightningSeedPassphrase,
      },
      cbk);
    }],

    // Create wallet
    createWallet: [
      'createSeed',
      'nonAuthenticatedLnd',
      ({createSeed, nonAuthenticatedLnd}, cbk) =>
    {
      return createWallet({
        lnd: nonAuthenticatedLnd,
        passphrase: lightningSeedPassphrase,
        password: lightningWalletPassword,
        seed: createSeed.seed,
      },
      cbk);
    }],

    // Get admin macaroon
    macaroon: [
      'createWallet',
      'spawnChainDaemon',
      ({spawnChainDaemon}, cbk) =>
    {
      const macaroonPath = join(spawnChainDaemon.dir, adminMacaroonFileName);

      return asyncRetry({interval, times}, cbk => {
        try {
          const macaroon = readFileSync(macaroonPath).toString('base64');

          if (!macaroon) {
            throw new Error('ExpectedMacaroonDataAtMacaroonPath');
          }

          return cbk(null, macaroon);
        } catch (err) {
          return cbk([503, 'FailedToGetAdminMacaroon', {err}]);
        }
      },
      cbk);
    }],

    // Wallet details
    wallet: [
      'cert',
      'getPorts',
      'macaroon',
      ({cert, getPorts, macaroon}, cbk) =>
    {
      return cbk(null, {
        cert,
        macaroon,
        socket: `${localhost}:${getPorts.rpc}`,
      });
    }],

    // Instantiate lnd
    lnd: ['wallet', ({wallet}, cbk) => {
      try {
        const {lnd} = authenticatedLndGrpc({
          cert: wallet.cert,
          macaroon: wallet.macaroon,
          socket: wallet.socket,
        });

        return cbk(null, lnd);
      } catch (err) {
        return cbk([503, 'FailedToInstantiateLndWhenSpawning', {err}]);
      }
    }],

    // Delay to make sure everything has come together
    delay: ['lnd', ({lnd}, cbk) => {
      return asyncRetry(
        {interval, times},
        cbk => {
          return getWalletInfo({lnd}, (err, res) => {
            if (!!err) {
              return cbk(err);
            }

            if (!res.is_synced_to_chain) {
              return cbk([503, 'ExpectedNodeSyncToChain']);
            }

            return cbk(null, res);
          });
        },
        cbk
      );
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    const kill = () => {
      res.spawnChainDaemon.daemon.kill();
      res.spawnLightningDaemon.daemon.kill();

      setTimeout(() => {
        res.spawnLightningDaemon.daemon.kill('SIGKILL');
      },
      1000 * 3);

      return;
    };

    process.setMaxListeners(20);

    process.on('uncaughtException', err => {
      kill();

      return setTimeout(() => process.exit(1), 5000);
    });

    return cbk(null, {
      kill,
      chain_listen_port: res.spawnChainDaemon.listen_port,
      chain_rpc_cert: res.spawnChainDaemon.rpc_cert,
      chain_rpc_pass: chainPass,
      chain_rpc_port: res.spawnChainDaemon.rpc_port,
      chain_rpc_user: chainUser,
      listen_ip: '127.0.0.1',
      listen_port: res.getPorts.listen,
      lnd: res.lnd,
      lnd_cert: res.wallet.cert,
      lnd_macaroon: res.wallet.macaroon,
      lnd_socket: res.wallet.socket,
      mining_key: res.miningKey.private_key,
      public_key: res.delay.public_key,
      rpc_port: res.getPorts.rpc,
      seed: res.createSeed.seed,
      socket: `127.0.0.1:${res.getPorts.listen}`,
    });
  });
};
