const {test} = require('tap');

const scriptFromChainAddress = require('./../../chain/script_from_chain_address');

const tests = [
  {
    args: {
      bech32_address: 'bc1qct4whle4te6qz6y7mjqxgufuvngz5h46mr6z2z3yjlpg5zvpkqyscrgp6y',
    },
    description: 'Script derived from bech32 address',
    expected: {
      script: '0020c2eaebff355e7401689edc8064713c64d02a5ebad8f4250a2497c28a0981b009',
    },
  },
  {
    args: {p2pkh_address: '1Cak4mhFsBG3X8xtqSnZsAHWzhUWTW31bR'},
    description: 'Script derived from p2pkh address',
    expected: {
      script: '76a9147f0b0f291632f1cdcb2854fc555e69dc957bb94588ac',
    },
  },
  {
    args: {p2sh_address: '3EENzQdQS3BvvnkeJjC5uVwUKFuTczpnok'},
    description: 'Script derived from p2sh address',
    expected: {
      script: 'a914898ffd60ad6091221250047a9f2bd6456190263487',
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    const {script} = scriptFromChainAddress(args);

    equal(script, expected.script, 'Script derived from address');

    return end();
  });
});
