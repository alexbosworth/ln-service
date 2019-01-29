const {join} = require('path');

const grpc = require('grpc');
const {loadSync} = require('@grpc/proto-loader');

const {autopilotServiceType} = require('./conf/grpc_services');
const expectedSslConfiguration = require('./conf/lnd').grpc_ssl_cipher_suites;
const {defaultServiceType} = require('./conf/grpc_services');
const {packageTypes} = require('./conf/grpc_services');
const {protoFiles} = require('./conf/grpc_services');
const {signerServiceType} = require('./conf/grpc_services');
const {unlockerServiceType} = require('./conf/grpc_services');
const {walletServiceType} = require('./conf/grpc_services');

const confDir = 'conf';
const {GRPC_SSL_CIPHER_SUITES} = process.env;
const isHex = str => !!str && /^([0-9A-Fa-f]{2})+$/g.test(str);

/** GRPC interface to the Lightning Network Daemon (lnd).

  Make sure to provide a cert when using LND with its default self-signed cert

  A macaroon is required when using authentication-required service types

  {
    [cert]: <Base64 or Hex Serialized LND TLS Cert>
    [macaroon]: <Base64 or Hex Serialized Macaroon String>
    [service]: <Service Name String> (default is "Lightning")
    socket: <Host:Port String>
  }

  @throws
  <ExpectedBase64EncodedGrpcMacaroonFile Error>
  <ExpectedBase64EncodedTlsCertFileString Error>
  <ExpectedGrpcIpOrDomainWithPortString Error>
  <ExpectedGrpcSslCipherSuitesEnvVar Error>
  <UnexpectedLightningDaemonServiceType Error>
  <UnexpectedServiceType Error>

  @returns
  <LND GRPC Api Object>
*/
module.exports = ({cert, macaroon, service, socket}) => {
  if (service !== unlockerServiceType && !macaroon) {
    throw new Error('ExpectedBase64OrHexEncodedGrpcMacaroonFile');
  }

  if (!socket) {
    throw new Error('ExpectedGrpcIpOrDomainWithPortString');
  }

  const protoFile = protoFiles[service || defaultServiceType];

  if (!protoFile) {
    throw new Error('UnexpectedServiceType');
  }

  const packageDefinition = loadSync(join(__dirname, confDir, protoFile), {
    defaults: true,
    enums: String,
    keepCase: true,
    longs: String,
    oneofs: true,
  });

  const rpc = grpc.loadPackageDefinition(packageDefinition);

  // Exit early when cert passing with unexpected GRPC_SSL_CIPHER_SUITES type
  if (!!cert && GRPC_SSL_CIPHER_SUITES !== expectedSslConfiguration) {
    throw new Error('ExpectedGrpcSslCipherSuitesEnvVar');
  }

  let credentials;
  const serviceType = service || defaultServiceType;
  let ssl;

  if (isHex(cert)) {
    ssl = grpc.credentials.createSsl(Buffer.from(cert, 'hex'));
  } else if (!!cert) {
    ssl = grpc.credentials.createSsl(Buffer.from(cert, 'base64'));
  } else {
    ssl = grpc.credentials.createSsl();
  }

  switch (serviceType) {
  case autopilotServiceType:
  case defaultServiceType:
  case signerServiceType:
  case walletServiceType:
    let macaroonData;

    if (isHex(macaroon)) {
      macaroonData = macaroon;
    } else if (!!macaroon) {
      macaroonData = Buffer.from(macaroon, 'base64').toString('hex');
    } else {
      throw new Error('ExpectedBase64OrHexEncodedGrpcMacaroonFile');
    }

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

  return new rpc[packageTypes[serviceType]][serviceType](socket, credentials);
};
