const {existsSync} = require('fs');
const {join} = require('path');
const {readFileSync} = require('fs');

const grpc = require('grpc');
const {loadSync} = require('@grpc/proto-loader');

const grpcSslCipherSuites = require('./conf/lnd').grpc_ssl_cipher_suites;

const adminMacaroonFileName = 'admin.macaroon';
const defaultServiceType = 'Lightning';
const {GRPC_SSL_CIPHER_SUITES} = process.env;
const {LNSERVICE_LND_DIR} = process.env;
const tlsCertFileName = 'tls.cert';

/** GRPC interface to the Lightning Network Daemon (lnd).

  {
    [cert]: <Base64 Serialized LND TLS Cert>
    host: <Host String>
    [macaroon]: <Base64 Serialized Macaroon String>
    [service]: <Service Name String> // "WalletUnlocker"|"Lightning" (default)
  }

  @throws
  <Error> on grpc interface creation failure

  @returns
  <LND GRPC Api Object>
*/
module.exports = ({cert, host, macaroon, service}) => {
  const packageDefinition = loadSync(__dirname + '/conf/grpc.proto', {
    defaults: true,
    enums: String,
    keepCase: true,
    longs: String,
    oneofs: true,
  });

  const rpc = grpc.loadPackageDefinition(packageDefinition);

  // Exit early when the environment variable cipher suite is not correct
  if (GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
    throw new Error('ExpectedEnvVarGRPC_SSL_CIPHER_SUITES');
  }

  let certData;
  let credentials;
  let macaroonData;
  const serviceType = service || defaultServiceType;

  if (!!cert) {
    certData = Buffer.from(cert, 'base64');
  } else {
    const certPath = join(LNSERVICE_LND_DIR, tlsCertFileName);

    if (!existsSync(certPath)) {
      throw new Error('ExpectedTlsCert');
    }

    certData = readFileSync(certPath)
  }

  const ssl = grpc.credentials.createSsl(certData);

  switch (serviceType) {
  case 'Lightning':
    if (!!macaroon) {
      macaroonData = Buffer.from(macaroon, 'base64').toString('hex');
    } else {
      const macaroonPath = join(LNSERVICE_LND_DIR, adminMacaroonFileName);

      if (!existsSync(macaroonPath)) {
        throw new Error('ExpectedMacaroonFile');
      }

      macaroonData = readFileSync(macaroonPath).toString('hex');
    }

    const macCreds = grpc.credentials.createFromMetadataGenerator((_, cbk) => {
      const metadata = new grpc.Metadata();

      metadata.add('macaroon', macaroonData);

      return cbk(null, metadata);
    });

    credentials = grpc.credentials.combineChannelCredentials(ssl, macCreds);
    break;

  case 'WalletUnlocker':
    credentials = ssl;
    break;

  default:
    throw new Error('UnexpectedLightningDaemonServiceType');
  }

  return new rpc.lnrpc[serviceType](host, credentials);
};

