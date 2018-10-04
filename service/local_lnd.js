const {existsSync} = require('fs');
const {join} = require('path');
const {readFileSync} = require('fs');

const {lightningDaemon} = require('./../lightning');

const adminMacaroonFileName = 'admin.macaroon';
const chainDirName = 'chain';
const dataDirName = 'data';
const lndGrpcPort = process.env.LND_GRPC_PORT || 10009;
const lndHost = process.env.LND_HOST || 'localhost';
const {LNSERVICE_CHAIN} = process.env;
const {LNSERVICE_LND_DIR} = process.env;
const {LNSERVICE_NETWORK} = process.env;
const tlsCertFileName = 'tls.cert';

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
  const certPath = join(LNSERVICE_LND_DIR, tlsCertFileName);
  const host = `${lndHost}:${lndGrpcPort}`;

  if (!existsSync(certPath)) {
    throw new Error('ExpectedTlsCert');
  }

  const cert = readFileSync(certPath).toString('base64');

  // Exit early with unauthenticated connection when in unlocker mode
  if (!!args.is_unlocker) {
    return lightningDaemon({cert, host, service: 'WalletUnlocker'});
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

  return lightningDaemon({cert, host, macaroon});
};

