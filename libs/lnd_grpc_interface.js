const grpc = require('grpc');

/** GRPC interface to LND
*/
module.exports = (path, host) => {
  const rpc = grpc.load(path);

  return new rpc.lnrpc.Lightning(host, grpc.credentials.createInsecure());
};

