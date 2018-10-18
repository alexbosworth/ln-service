const config = require('dotenv').config(); // Needed for .env support
const {existsSync} = require('fs');
const {join} = require('path');
const {readFileSync} = require('fs');
const {lookup} = require('dns-sync');

const {lightningDaemon} = require('./../lightning');

const adminMacaroonFileName = 'admin.macaroon';
const chainDirName = 'chain';
const dataDirName = 'data';
const host = process.env.LND_HOST || 'localhost';
const isIp = /^(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))$/;
const lndGrpcPort = process.env.LND_GRPC_PORT || 10009;
const {LNSERVICE_CHAIN} = process.env;
const {LNSERVICE_LND_DIR} = process.env;
const {LNSERVICE_NETWORK} = process.env;
const tlsCertFileName = 'tls.cert';

const lndHost = isIp.test(host) ? host : lookup(host);

/** Get the Lightning Daemon connection

  {
    [is_unlocker]: <Is Unlocker Connection Bool>
  }

  @throws
  <Lightning Daemon Connection Failure>

  @returns
  {
    lnd: <Lightning Network Daemon GRPC Connection Object>
  }
*/
module.exports = args => {
  if (!LNSERVICE_CHAIN) {
    throw new Error('ExpectedLnServiceLnChainEnvVariable');
  }

  if (!LNSERVICE_LND_DIR) {
    throw new Error('ExpectedLnServiceLndDirEnvVariable');
  }

  if (!LNSERVICE_NETWORK) {
    throw new Error('ExpectedLnServiceLnNetworkEnvVariable');
  }

  const certPath = join(LNSERVICE_LND_DIR, tlsCertFileName);
  const socket = `${lndHost}:${lndGrpcPort}`;

  if (!existsSync(certPath)) {
    throw new Error('ExpectedTlsCert');
  }

  const cert = readFileSync(certPath).toString('base64');

  // Exit early with unauthenticated connection when in unlocker mode
  if (!!args.is_unlocker) {
    return lightningDaemon({cert, socket, service: 'WalletUnlocker'});
  }

  const macaroonPath = join(
    LNSERVICE_LND_DIR,
    dataDirName,
    chainDirName,
    LNSERVICE_CHAIN,
    LNSERVICE_NETWORK,
    adminMacaroonFileName
  );

  if (!existsSync(macaroonPath)) {
    throw new Error('ExpectedMacaroonFile');
  }

  const macaroon = readFileSync(macaroonPath).toString('base64');

  return lightningDaemon({cert, macaroon, socket});
};

