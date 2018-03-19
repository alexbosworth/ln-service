const {existsSync} = require('fs');
const {join} = require('path');
const {readFileSync} = require('fs');

const grpc = require('grpc');

const grpcSslCipherSuites = require('./conf/lnd').grpc_ssl_cipher_suites;

const {GRPC_SSL_CIPHER_SUITES} = process.env;
const {LNSERVICE_LND_DATADIR} = process.env;

const certPath = join(LNSERVICE_LND_DATADIR, 'tls.cert');
const macaroonPath = join(LNSERVICE_LND_DATADIR, 'data', 'admin.macaroon');

/** GRPC interface to the Lightning Network Daemon (lnd).

  {
    host: <Host String>
    path: <Path String>
    [service]: <Service Name String>
  }

  @returns
  <LND GRPC Api Object>
*/
module.exports = ({host, path, service}) => {
  const rpc = grpc.load(path);

  // Exit early when the environment variable cipher suite is not correct
  if (GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
    throw new Error('ExpectedEnvVarGRPC_SSL_CIPHER_SUITES');
  }

  // Exit early when there is no data directory specified
  if (!LNSERVICE_LND_DATADIR) {
    throw new Error('ExpectedEnvVarLNSERVICE_LND_DATADIR');
  }

  // Exit early when there is no TLS cert
  if (!existsSync(certPath)) {
    throw new Error('ExpectedTlsCert');
  }

  // Exit early when there is no macaroon
  if (!existsSync(macaroonPath)) {
    throw new Error('ExpectedMacaroonFile');
  }

  const macaroon = grpc.credentials.createFromMetadataGenerator((_, cbk) => {
    const metadata = new grpc.Metadata();

    metadata.add('macaroon', readFileSync(macaroonPath).toString('hex'));

    return cbk(null, metadata);
  });

  const ssl = grpc.credentials.createSsl(readFileSync(certPath));

  const combined = grpc.credentials.combineChannelCredentials(ssl, macaroon);

	return new rpc.lnrpc[service || 'Lightning'](host, combined);
};

