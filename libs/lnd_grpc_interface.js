const fsReadFileSync = require('fs').readFileSync;
const pathJoin = require('path').join;

const grpc = require('grpc');

const grpcSslCipherSuites = process.env.GRPC_SSL_CIPHER_SUITES;
const lndDataDir = process.env.LNSERVICE_LND_DATADIR;

const lndConfig = require('./../config/lnd');

/** GRPC interface to the Lightning Network Daemon (lnd).

  @returns
  <GRPC Api Object>
*/
module.exports = (path, host) => {
  const rpc = grpc.load(path);

  if (grpcSslCipherSuites !== lndConfig.grpc_ssl_cipher_suites) {
    throw new Error('Expected env var GRPC_SSL_CIPHER_SUITES');
  }

  if (!lndDataDir) {
    throw new Error('Expected env var LNSERVICE_LND_DATADIR');
  }

  const cert = fsReadFileSync(pathJoin(lndDataDir, 'tls.cert'));

  return new rpc.lnrpc.Lightning(host, grpc.credentials.createSsl(cert));
};

