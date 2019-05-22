const grpc = require('grpc');
const isHex = require('is-hex');

/** Get SSL for gRPC

  {
    [cert]: <Cert String>
  }

  @returns
  {
    ssl: <SSL gRPC Object>
  }
*/
module.exports = ({cert}) => {
  if (isHex(cert)) {
    return {ssl: grpc.credentials.createSsl(Buffer.from(cert, 'hex'))};
  }

  if (!!cert) {
    return {ssl: grpc.credentials.createSsl(Buffer.from(cert, 'base64'))};
  }

  return {ssl: grpc.credentials.createSsl()};
};
