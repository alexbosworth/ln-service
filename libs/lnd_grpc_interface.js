const grpc = require('grpc');

/** GRPC interface to the Lightning Network Daemon (lnd).
*/
module.exports = (path, host) => {
  const rpc = grpc.load(path);

  return new rpc.lnrpc.Lightning(host, grpc.credentials.createInsecure());
};

