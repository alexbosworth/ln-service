const grpc = require('grpc');

const isHex = n => !(n.length % 2) && /^[0-9A-F]*$/i.test(n);

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
  if (!!cert && isHex(cert)) {
    return {ssl: grpc.credentials.createSsl(Buffer.from(cert, 'hex'))};
  }

  if (!!cert) {
    return {ssl: grpc.credentials.createSsl(Buffer.from(cert, 'base64'))};
  }

  return {ssl: grpc.credentials.createSsl()};
};
