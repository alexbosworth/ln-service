const {join} = require('path');

const grpc = require('grpc');
const {loadSync} = require('@ln-zap/proto-loader');

const {defaultSocket} = require('./conf/grpc_services');
const grpcCredentials = require('./grpc_credentials');
const {grpcSslCipherSuites} = require('./conf/grpc_services');
const {maxReceiveMessageLength} = require('./conf/grpc_services');
const {packageTypes} = require('./conf/grpc_services');
const {protoFiles} = require('./conf/grpc_services');
const {serviceTypes} = require('./conf/grpc_services');

const {GRPC_SSL_CIPHER_SUITES} = process.env;
const {keys} = Object;
const protosDir = 'protos';

const grpcOptions = {
  defaults: true,
  enums: String,
  keepCase: true,
  longs: String,
  oneofs: true,
};

/** Initiate an gRPC API Methods Object for authenticated methods

  Both the cert and macaroon expect the entire serialized lnd generated file

  {
    [cert]: <Base64 or Hex Serialized LND TLS Cert>
    macaroon: <Base64 or Hex Serialized Macaroon String>
    [socket]: <Host:Port Network Address String>
  }

  @throws
  <Error>

  @returns
  {
    lnd: {
      autopilot: <Autopilot gRPC Methods Object>
      chain: <ChainNotifier gRPC Methods Object>
      default: <Default gRPC Methods Object>
      invoices: <Invoices gRPC Methods Object>
      router: <Router gRPC Methods Object>
      signer: <Signer gRPC Methods Object>
      wallet: <WalletKit gRPC Methods Object>
    }
  }
*/
module.exports = ({cert, macaroon, socket}) => {
  if (!macaroon) {
    throw new Error('ExpectedMacaroonCredentialToInstantiateGrpcMethods');
  }

  const {credentials} = grpcCredentials({cert, macaroon});
  const lndSocket = socket || defaultSocket;

  // Exit early when cert passing with unexpected GRPC_SSL_CIPHER_SUITES type
  if (!!cert && GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
    process.env.GRPC_SSL_CIPHER_SUITES = grpcSslCipherSuites;
  }

  // Assemble different services from their proto files
  const lnd = keys(serviceTypes).reduce((services, type) => {
    const service = serviceTypes[type];

    const protoPath = join(__dirname, protosDir, protoFiles[service]);

    const rpc = grpc.loadPackageDefinition(loadSync(protoPath, grpcOptions));

    const api = new rpc[packageTypes[service]][service](socket, credentials, {
      'grpc.max_receive_message_length': maxReceiveMessageLength,
    });

    services[type] = api;

    return services;
  },
  {});

  return {lnd};
};
