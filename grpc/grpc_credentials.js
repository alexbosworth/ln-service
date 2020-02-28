const grpc = require('grpc');
const isBase64 = require('is-base64');

const grpcSsl = require('./grpc_ssl');

const isHex = n => !(n.length % 2) && /^[0-9A-F]*$/i.test(n);

/** Credentials for grpc

  {
    [cert]: <Base64 or Hex Serialized LND TLS Cert>
    [macaroon]: <Base64 or Hex Serialized Macaroon String>
  }

  @throws
  <Error>

  @returns
  {
    credentials: <gRPC Credentials Object>
  }
*/
module.exports = ({cert, macaroon}) => {
  const {ssl} = grpcSsl({cert});

  if (!macaroon) {
    throw new Error('ExpectedMacaroonDataToCreateCombinedCredentials');
  }

  let macaroonData;

  if (!!macaroon && !!macaroon.length && isHex(macaroon)) {
    macaroonData = macaroon;
  } else if (!!macaroon && isBase64(macaroon)) {
    macaroonData = Buffer.from(macaroon, 'base64').toString('hex');
  } else {
    throw new Error('ExpectedBase64OrHexEncodedMacaroonToCreateCredentials');
  }

  const macCred = grpc.credentials.createFromMetadataGenerator((_, cbk) => {
    const metadata = new grpc.Metadata();

    metadata.add('macaroon', macaroonData);

    return cbk(null, metadata);
  });

  const credentials = grpc.credentials.combineChannelCredentials(ssl, macCred);

  return {credentials};
};
