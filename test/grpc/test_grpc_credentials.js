const {test} = require('tap');

const grpcCredentials = require('./../../grpc/grpc_credentials');

const tests = [
  {
    args: {},
    description: 'A macaroon is required to create grpc credentials',
    error: 'ExpectedMacaroonDataToCreateCombinedCredentials',
  },
  {
    args: {macaroon: 1},
    description: 'A hex or base64 macaroon is required',
    error: 'ExpectedBase64OrHexEncodedMacaroonToCreateCredentials',
  },
  {
    args: {macaroon: '00'},
    description: 'A hex macaroon',
  },
  {
    args: {macaroon: Buffer.from('00', 'hex').toString('base64')},
    description: 'A base64 macaroon',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepEqual, end, equal, throws}) => {
    if (!!error) {
      throws(() => grpcCredentials(args), new Error(error), 'Got error');
    } else {
      const {credentials} = grpcCredentials(args);

      equal(!!credentials, true, 'Got credentials');
    }

    return end();
  });
});
