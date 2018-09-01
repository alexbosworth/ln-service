const {join} = require('path');

const grpc = require('grpc');
const {loadSync} = require('@grpc/proto-loader');

const grpcSslCipherSuites = require('./conf/lnd').grpc_ssl_cipher_suites;

const confDir = 'conf';
const defaultServiceType = 'Lightning';
const {GRPC_SSL_CIPHER_SUITES} = process.env;
const protoFile = 'grpc.proto';
const unlockerServiceType = 'WalletUnlocker';

/** GRPC interface to the Lightning Network Daemon (lnd).

  {
    cert: <Base64 Serialized LND TLS Cert>
    host: <Host:Port String>
    macaroon: <Base64 Serialized Macaroon String>
    [service]: <Service Name String> // "WalletUnlocker"|"Lightning" (default)
  }

  @throws
  <Error> on grpc interface creation failure

  @returns
  <LND GRPC Api Object>
*/
module.exports = ({cert, host, macaroon, service}) => {
  if (!cert) {
    throw new Error('ExpectedBase64EncodedTlsCertFileString');
  }

  if (!host) {
    throw new Error('ExpectedGrpcHostWithPortString');
  }

  if (!macaroon) {
    throw new Error('ExpectedBase64EncodedGrpcMacaroonFile');
  }

  const packageDefinition = loadSync(join(__dirname, confDir, protoFile), {
    defaults: true,
    enums: String,
    keepCase: true,
    longs: String,
    oneofs: true,
  });

  const rpc = grpc.loadPackageDefinition(packageDefinition);

  // Exit early when GRPC_SSL_CIPHER_SUITES cipher suite is not correct
  if (GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
    throw new Error('ExpectedGrpcSslCipherSuitesEnvVar');
  }

  const certData = Buffer.from(cert, 'base64');
  let credentials;
  const serviceType = service || defaultServiceType;

  const ssl = grpc.credentials.createSsl(certData);

  switch (serviceType) {
  case defaultServiceType:
    const macaroonData = Buffer.from(macaroon, 'base64').toString('hex');

    const macCreds = grpc.credentials.createFromMetadataGenerator((_, cbk) => {
      const metadata = new grpc.Metadata();

      metadata.add('macaroon', macaroonData);

      return cbk(null, metadata);
    });

    credentials = grpc.credentials.combineChannelCredentials(ssl, macCreds);
    break;

  case unlockerServiceType:
    credentials = ssl;
    break;

  default:
    throw new Error('UnexpectedLightningDaemonServiceType');
  }

  return new rpc.lnrpc[serviceType](host, credentials);
};

