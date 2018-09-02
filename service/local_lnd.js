const {existsSync} = require('fs');
const {join} = require('path');
const {readFileSync} = require('fs');

const {lightningDaemon} = require('./../lightning');

const adminMacaroonFileName = 'admin.macaroon';
const chainDirName = 'chain';
const dataDirName = 'data';
const {LND_GRPC_PORT} = process.env;
const {LND_HOST} = process.env;
const {LNSERVICE_CHAIN} = process.env;
const {LNSERVICE_LND_DIR} = process.env;
const {LNSERVICE_NETWORK} = process.env;
const tlsCertFileName = 'tls.cert';

const lndGrpcPort = LND_GRPC_PORT || 10009;
const lndHost = LND_HOST || 'localhost';

/** Get the Lightning Daemon connection

  {}

  @throws
  <Lightning Daemon Connection Failure>

  @returns
  {
    lnd: <Lightning Network Daemon GRPC Connection Object>
  }
*/
module.exports = ({log, wss}) => {
  const certPath = join(LNSERVICE_LND_DIR, tlsCertFileName);

  const macaroonPath = join(
    LNSERVICE_LND_DIR,
    dataDirName,
    chainDirName,
    LNSERVICE_CHAIN,
    LNSERVICE_NETWORK,
    adminMacaroonFileName
  );

  if (!existsSync(certPath)) {
    throw new Error('ExpectedTlsCert');
  }
  if (!existsSync(macaroonPath)) {
    throw new Error('ExpectedMacaroonFile');
  }

  return lightningDaemon({
    cert: readFileSync(certPath).toString('base64'),
    host: `${lndHost}:${lndGrpcPort}`,
    macaroon: readFileSync(macaroonPath).toString('base64'),
  });
};

