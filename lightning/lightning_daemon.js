const {existsSync} = require('fs');
const {join} = require('path');
const {readFileSync} = require('fs');

const grpc = require('grpc');

const grpcSslCipherSuites = require('./conf/lnd').grpc_ssl_cipher_suites;

const {GRPC_SSL_CIPHER_SUITES} = process.env;
const {LNSERVICE_LND_DIR} = process.env;

/** GRPC interface to the Lightning Network Daemon (lnd).

  {
    [cert]: <Base64 Serialized LND TLS Cert>
    host: <Host String>
    [macaroon]: <Base64 Serialized Macaroon String>
    [service]: <Service Name String>
  }

  @throws
  <Error> on grpc interface creation failure

  @returns
  <LND GRPC Api Object>
*/
module.exports = ({cert, host, macaroon, service}) => {
  const rpc = grpc.load(__dirname + '/conf/grpc.proto');

  // Exit early when the environment variable cipher suite is not correct
  if (GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
    throw new Error('ExpectedEnvVarGRPC_SSL_CIPHER_SUITES');
  }

  // Exit early when there is no data directory specified
  if ((!cert || !macaroon) && !LNSERVICE_LND_DIR) {
    throw new Error('ExpectedEnvVarLNSERVICE_LND_DIR');
  }

  let certData;
  let macaroonData;

  if (!!cert) {
    certData = Buffer.from(cert, 'base64');
  } else {
    const certPath = join(LNSERVICE_LND_DIR, 'tls.cert');

    // Exit early when there is no TLS cert
    if (!existsSync(certPath)) {
      throw new Error('ExpectedTlsCert');
    }

    certData = readFileSync(certPath)
  }

  if (!!macaroon) {
    macaroonData = Buffer.from(macaroon, 'base64').toString('hex');
  } else {
    const macaroonPath = join(LNSERVICE_LND_DIR, 'admin.macaroon');

    // Exit early when there is no macaroon
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

  const ssl = grpc.credentials.createSsl(certData);

  const combined = grpc.credentials.combineChannelCredentials(ssl, macCreds);

  return new rpc.lnrpc[service || 'Lightning'](host, combined);
};

