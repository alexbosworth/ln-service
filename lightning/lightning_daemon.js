const {join} = require('path');

const grpc = require('grpc');
const {loadSync} = require('@grpc/proto-loader');

const expectedSslConfiguration = require('./conf/lnd').grpc_ssl_cipher_suites;

const confDir = 'conf';
const defaultServiceType = 'Lightning';
const {GRPC_SSL_CIPHER_SUITES} = process.env;
const isHex = str => !!str && /^([0-9A-Fa-f]{2})+$/g.test(str);
const isBase64 = n => !!n && Buffer.from(n, 'base64').toString('base64') === n;
const protoFile = 'grpc.proto';
const unlockerServiceType = 'WalletUnlocker';

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
  } else if (isBase64(cert)) {
    ssl = grpc.credentials.createSsl(Buffer.from(cert, 'base64'));
  } else {
    ssl = grpc.credentials.createSsl();
  }

  switch (serviceType) {
  case defaultServiceType:
    let macaroonData;

    if (isHex(macaroon)) {
      macaroonData = macaroon;
    } else if (isBase64(macaroon)) {
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

  return new rpc.lnrpc[serviceType](socket, credentials);
};

