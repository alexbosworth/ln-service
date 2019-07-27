const {join} = require('path');

const grpc = require('grpc');
const {loadSync} = require('@ln-zap/proto-loader');

const grpcSsl = require('./grpc_ssl');
const {grpcSslCipherSuites} = require('./conf/grpc_services');
const {packageTypes} = require('./conf/grpc_services');
const {protoFiles} = require('./conf/grpc_services');

const protosDir = 'protos';
const defaultSocket = '127.0.0.1:10009';
const {GRPC_SSL_CIPHER_SUITES} = process.env;
const service = 'WalletUnlocker';

const grpcOptions = {
  defaults: true,
  enums: String,
  keepCase: true,
  longs: String,
  oneofs: true,
};

/** Unauthenticated gRPC interface to the Lightning Network Daemon (lnd).

  Make sure to provide a cert when using LND with its default self-signed cert

  {
    [cert]: <Base64 or Hex Serialized LND TLS Cert>
    [socket]: <Host:Port String>
  }

  @throws
  <Error>

  @returns
  {
    lnd: {
      unlocker: <Unlocker LND GRPC Api Object>
    }
  }
*/
module.exports = ({cert, socket}) => {
  const credentials = grpcSsl({cert}).ssl;
  const lndSocket = socket || defaultSocket;
  const protoPath = join(__dirname, protosDir, protoFiles[service]);

  const rpc = grpc.loadPackageDefinition(loadSync(protoPath, grpcOptions));

  // Exit early when cert passing with unexpected GRPC_SSL_CIPHER_SUITES type
  if (!!cert && GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
    process.env.GRPC_SSL_CIPHER_SUITES = grpcSslCipherSuites;
  }

  const lnd = new rpc[packageTypes[service]][service](lndSocket, credentials);

  return {lnd: {unlocker: lnd}};
};
