const {join} = require('path');
const {readFileSync} = require('fs');
const {spawn} = require('child_process');

const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const asyncRetry = require('async/retry');
const {ECPair} = require('bitcoinjs-lib');
const {networks} = require('bitcoinjs-lib');
const openPortFinder = require('portfinder');

const {changePassword} = require('./../../');
const {createSeed} = require('./../../');
const {createWallet} = require('./../../');
const generateBlocks = require('./generate_blocks');
const {authenticatedLndGrpc} = require('./../../');
const spawnChainDaemon = require('./spawn_chain_daemon');
const {stopDaemon} = require('./../../');
const {unauthenticatedLndGrpc} = require('./../../');
const {unlockWallet} = require('./../../');

const adminMacaroonFileName = 'admin.macaroon';
const chainPass = 'pass';
const chainRpcCertName = 'rpc.cert';
const chainUser = 'user';
const invoiceMacaroonFileName = 'invoice.macaroon';
const lightningDaemonExecFileName = 'lnd';
const lightningDaemonLogPath = 'logs/';
const lightningSeedPassphrase = 'passphrase';
const lightningTlsCertFileName = 'tls.cert';
const lightningTlsKeyFileName = 'tls.key';
const lightningWalletPassword = 'password';
const lndWalletUnlockerService = 'WalletUnlocker';
const localhost = '127.0.0.1';
const maxSpawnChainDaemonAttempts = 3;
const readMacaroonFileName = 'readonly.macaroon';
const retryCreateSeedCount = 5;
const startPortRange = 7593;
const startWalletTimeoutMs = 4500;

/** Run a change password test

  {}

  @returns via cbk
  {
    kill: <Stop Function> ({}, err => {})
    lnd: <Authenticated LND gRPC API Object>
  }
*/
module.exports = ({network}, cbk) => {
  return asyncAuto({
    // Find open ports for the listen, REST and RPC ports
    getPorts: cbk => {
      return asyncMapSeries(['listen', 'rest', 'rpc'], (_, cbk) => {
        const port = startPortRange + Math.round(Math.random() * 2000);

        const stopPort = port + 20000;

        return setTimeout(() => {
          return openPortFinder.getPort({port, stopPort}, cbk);
        },
        50);
      },
      (err, ports) => {
        if (!!err || !Array.isArray(ports) || !ports.length) {
          return cbk([500, 'FailedToFindOpenPorts', err]);
        }

        const [listen, rest, rpc] = ports;

        return cbk(null, {listen, rest, rpc});
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

    // Generate a block
    generateBlock: ['spawnChainDaemon', ({spawnChainDaemon}, cbk) => {
      return generateBlocks({
        cert: readFileSync(spawnChainDaemon.rpc_cert),
        count: 1,
        host: localhost,
        pass: chainPass,
        port: spawnChainDaemon.rpc_port,
        user: chainUser,
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
      const {dir} = spawnChainDaemon;

      const daemon = spawn(lightningDaemonExecFileName, [
        '--adminmacaroonpath', join(dir, adminMacaroonFileName),
        '--bitcoin.active',
        '--bitcoin.chaindir', dir,
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
        '--invoicemacaroonpath', join(dir, invoiceMacaroonFileName),
        '--listen', `${localhost}:${getPorts.listen}`,
        '--logdir', join(dir, lightningDaemonLogPath),
        '--nobootstrap',
        '--readonlymacaroonpath', join(dir, readMacaroonFileName),
        '--restlisten', `${localhost}:${getPorts.rest}`,
        '--rpclisten', `${localhost}:${getPorts.rpc}`,
        '--tlscertpath', join(dir, lightningTlsCertFileName),
        '--tlskeypath', join(dir, lightningTlsKeyFileName),
      ]);

      daemon.stderr.on('data', data => {});

      let isReady = false;

      daemon.stdout.on('data', data => {
        if (!isReady && /gRPC.proxy.started/.test(data+'')) {
          isReady = true;

          return cbk();
        };

        return;
      });

      return;
    }],

    // Get connection to the no-wallet lnd
    nonAuthenticatedLnd: [
      'getPorts',
      'spawnChainDaemon',
      'spawnLightningDaemon',
      ({getPorts, spawnChainDaemon}, cbk) =>
    {
      const {dir} = spawnChainDaemon;

      const cert = readFileSync(join(dir, lightningTlsCertFileName));

      try {
        return cbk(null, unauthenticatedLndGrpc({
          cert: cert.toString('base64'),
          socket: `${localhost}:${getPorts.rpc}`,
        }).lnd);
      } catch (err) {
        return cbk([503, 'FailedToInstantiateNonAuthenticatedLnd', {err}]);
      }
    }],

    // Create seed
    createSeed: [
      'getPorts',
      'nonAuthenticatedLnd',
      'spawnChainDaemon',
      ({getPorts, nonAuthenticatedLnd, spawnChainDaemon}, cbk) =>
    {
      return asyncRetry(retryCreateSeedCount, cbk => {
        const {dir} = spawnChainDaemon;

        const cert = readFileSync(join(dir, lightningTlsCertFileName));

        const {lnd} = unauthenticatedLndGrpc({
          cert: cert.toString('base64'),
          socket: `${localhost}:${getPorts.rpc}`,
        });

        return createSeed({lnd, passphrase: lightningSeedPassphrase}, cbk);
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
      err => {
        if (!!err) {
          return cbk(err);
        }

        return cbk();
      });
    }],

    // Get admin macaroon
    macaroon: [
      'createWallet',
      'spawnChainDaemon',
      ({spawnChainDaemon}, cbk) =>
    {
      const {dir} = spawnChainDaemon;
      const interval = retryCount => 50 * Math.pow(2, retryCount);
      const times = 15;

      const macaroonPath = join(dir, adminMacaroonFileName);

      return asyncRetry({interval, times}, cbk => {
        try {
          return cbk(null, readFileSync(macaroonPath).toString('base64'));
        } catch (err) {
          return cbk([503, 'FailedToGetAdminMacaroon', err]);
        }
      },
      cbk);
    }],

    // Wallet details
    wallet: [
      'macaroon',
      'spawnChainDaemon',
      'getPorts',
      ({getPorts, macaroon, spawnChainDaemon}, cbk) =>
    {
      const {dir} = spawnChainDaemon;
      const certPath = join(dir, lightningTlsCertFileName);

      return cbk(null, {
        macaroon,
        cert: readFileSync(certPath).toString('base64'),
        host: `${localhost}:${getPorts.rpc}`,
      });
    }],

    // Wallet LND GRPC API
    lnd: ['wallet', ({wallet}, cbk) => {
      try {
        return cbk(null, authenticatedLndGrpc({
          cert: wallet.cert,
          macaroon: wallet.macaroon,
          socket: wallet.host,
        }).lnd);
      } catch (err) {
        return cbk([503, 'FailedToInstantiateWalletLnd', err]);
      }
    }],

    // Stop LND
    stopLnd: ['lnd', async ({lnd}) => {
      const interval = retryCount => 50 * Math.pow(2, retryCount);
      const times = 15;

      return await asyncRetry({interval, times}, async () => {
        return await stopDaemon({lnd});
      });
    }],

    // Restart LND (locked)
    restartLnd: [
      'getPorts',
      'spawnChainDaemon',
      'stopLnd',
      ({getPorts, spawnChainDaemon}, cbk) =>
    {
      const {dir} = spawnChainDaemon;

      const daemon = spawn(lightningDaemonExecFileName, [
        '--adminmacaroonpath', join(dir, adminMacaroonFileName),
        '--bitcoin.active',
        '--bitcoin.chaindir', dir,
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
        '--invoicemacaroonpath', join(dir, invoiceMacaroonFileName),
        '--listen', `${localhost}:${getPorts.listen}`,
        '--logdir', join(dir, lightningDaemonLogPath),
        '--nobootstrap',
        '--readonlymacaroonpath', join(dir, readMacaroonFileName),
        '--restlisten', `${localhost}:${getPorts.rest}`,
        '--rpclisten', `${localhost}:${getPorts.rpc}`,
        '--tlscertpath', join(dir, lightningTlsCertFileName),
        '--tlskeypath', join(dir, lightningTlsKeyFileName),
      ]);

      daemon.stderr.on('data', data => {});

      let isReady = false;

      daemon.stdout.on('data', data => {
        if (!isReady && /gRPC.proxy.started/.test(data+'')) {
          isReady = true;

          return cbk(null, {daemon});
        };

        return;
      });

      return;
    }],

    // Get tls cert
    cert: [
      'restartLnd',
      'spawnChainDaemon',
      ({spawnChainDaemon}, cbk) =>
    {
      const {dir} = spawnChainDaemon;
      const interval = retryCount => 50 * Math.pow(2, retryCount);
      const times = 15;

      const certPath = join(dir, lightningTlsCertFileName);

      return asyncRetry({interval, times}, cbk => {
        try {
          return cbk(null, readFileSync(certPath).toString('base64'));
        } catch (err) {
          return cbk([503, 'FailedToGetCertAfterRestart', err]);
        }
      },
      cbk);
    }],

    // Get locked restarted lnd
    restartedLnd: ['cert', 'getPorts', ({cert, getPorts}, cbk) => {
      try {
        return cbk(null, unauthenticatedLndGrpc({
          cert,
          socket: `${localhost}:${getPorts.rpc}`,
        }).lnd);
      } catch (err) {
        return cbk([503, 'FailedToLaunchLightningDaemon', err]);
      }
    }],

    // Change password
    changePassword: ['restartedLnd', ({restartedLnd}, cbk) => {
      return changePassword({
        current_password: lightningWalletPassword,
        lnd: restartedLnd,
        new_password: 'changed_passphrase',
      },
      cbk);
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    const {lnd} = res;

    const kill = () => {
      res.spawnChainDaemon.daemon.kill();
      res.restartLnd.daemon.kill();

      return;
    };

    process.on('uncaughtException', err => {
      kill();

      setTimeout(() => process.exit(1), 5000);
    });

    return cbk(null, {lnd, kill});
  });
};
