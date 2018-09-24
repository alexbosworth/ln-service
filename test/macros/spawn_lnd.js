const {join} = require('path');
const {readFileSync} = require('fs');
const {spawn} = require('child_process');

const asyncAuto = require('async/auto');
const {ECPair} = require('bitcoinjs-lib');
const {networks} = require('bitcoinjs-lib');
const openPortFinder = require('openport');

const {createSeed} = require('./../../');
const {createWallet} = require('./../../');
const {lightningDaemon} = require('./../../');
const spawnChainDaemon = require('./spawn_chain_daemon');

const adminMacaroonFileName = 'admin.macaroon';
const chainRpcCertName = 'rpc.cert';
const invoiceMacaroonFileName = 'invoice.macaroon';
const lightningDaemonExecFileName = 'lnd';
const lightningDaemonLogPath = 'logs/';
const lightningSeedPassphrase = 'passphrase';
const lightningTlsCertFileName = 'tls.cert';
const lightningTlsKeyFileName = 'tls.key';
const lightningWalletPassword = 'password';
const lndWalletUnlockerService = 'WalletUnlocker';
const localhost = '127.0.0.1';
const readMacaroonFileName = 'readonly.macaroon';
const startWalletTimeoutMs = 4500;

/** Spawn an lnd instance

  {}

  @returns via cbk
  {
    kill: <Stop Function> ({}, err => {})
    listen_port: <Listen Port Number>
    lnd: <LND GRPC API Object>
  }
*/
module.exports = ({network}, cbk) => {
  return asyncAuto({
    // Find open ports for the listen, REST and RPC ports
    getPorts: cbk => {
      const count = 3;
      const startingPort = 34567 + Math.round(Math.random() * 1000);

      return openPortFinder.find({count, startingPort}, (err, ports) => {
        if (!!err) {
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
        public_key: keyPair.publicKey,
      });
    },

    // Spawn a backing chain daemon for lnd
    spawnChainDaemon: ['miningKey', ({miningKey}, cbk) => {
      return spawnChainDaemon({
        daemon: 'btcd',
        is_tls: true,
        mining_public_key: miningKey.public_key,
      },
      cbk);
    }],

    // Spawn LND
    spawnLightningDaemon: [
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
        '--btcd.rpcpass', 'pass',
        '--btcd.rpcuser', 'user',
        '--datadir', dir,
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
        if (!isReady && /password.RPC.server.listening/.test(data+'')) {
          isReady = true;

          return cbk(null, {daemon});
        };
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
        return cbk(null, lightningDaemon({
          cert: cert.toString('base64'),
          host: `${localhost}:${getPorts.rpc}`,
          service: lndWalletUnlockerService,
        }));
      } catch (err) {
        return cbk([503, 'FailedToLaunchLightningDaemon', err]);
      }
    }],

    // Create seed
    createSeed: ['nonAuthenticatedLnd', ({nonAuthenticatedLnd}, cbk) => {
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
      err => {
        if (!!err) {
          return cbk(err);
        }

        return setTimeout(() => cbk(), startWalletTimeoutMs);
      });
    }],

    // Wallet details
    wallet: [
      'createWallet',
      'spawnChainDaemon',
      'getPorts',
      ({getPorts, spawnChainDaemon}, cbk) =>
    {
      const {dir} = spawnChainDaemon;
      const certPath = join(dir, lightningTlsCertFileName);
      const macaroonPath = join(dir, adminMacaroonFileName);

      return cbk(null, {
        cert: readFileSync(certPath).toString('base64'),
        host: `${localhost}:${getPorts.rpc}`,
        macaroon: readFileSync(macaroonPath).toString('base64'),
      });
    }],

    // Wallet LND GRPC API
    lnd: ['wallet', ({wallet}, cbk) => {
      try {
        return cbk(null, lightningDaemon({
          cert: wallet.cert,
          host: wallet.host,
          macaroon: wallet.macaroon,
        }));
      } catch (err) {
        return cbk([503, 'FailedToInstantiateWalletLnd', err]);
      }
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    const {lnd} = res;

    const kill = () => {
      res.spawnChainDaemon.daemon.kill();
      res.spawnLightningDaemon.daemon.kill();

      return;
    };

    return cbk(null, {
      kill,
      lnd,
      chain_listen_port: res.spawnChainDaemon.listen_port,
      chain_rpc_cert: res.spawnChainDaemon.rpc_cert,
      chain_rpc_port: res.spawnChainDaemon.rpc_port,
      listen_ip: localhost,
      listen_port: res.getPorts.listen,
    });
  });
};

