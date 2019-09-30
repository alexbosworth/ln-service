const {test} = require('tap');

const grpcSsl = require('./../../grpc/grpc_ssl');

const tests = [
  {args: {}, description: 'No arguments returns standard ssl'},
  {args: {cert: '00'}, description: 'Hex returns ssl'},
  {args: {cert: 'AA=='}, description: 'Base64 returns ssl'},
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepEqual, end, equal, type}) => {
    const {ssl} = grpcSsl(args);

    type(ssl, 'ChannelCredentials', 'Got channel credentials');

    return end();
  });
});
