const {test} = require('tap');

const scriptFromChainAddress = require('./../../chain/script_from_chain_address');

const tests = [
  {
    args: {
      bech32_address: 'bc1qct4whle4te6qz6y7mjqxgufuvngz5h46mr6z2z3yjlpg5zvpkqyscrgp6y',
    },
    description: 'Script derived from p2wsh bech32 address',
    expected: {
      script: '0020c2eaebff355e7401689edc8064713c64d02a5ebad8f4250a2497c28a0981b009',
    },
  },
  {
    args: {
      bech32_address: 'bc1qlrw9xexrpnx0rxnw39qywt0h8w8l6juw4aej6t',
    },
    description: 'Script derived from p2wpk bech32 address',
    expected: {script: '0014f8dc5364c30cccf19a6e8940472df73b8ffd4b8e',},
  },
  {
    args: {
      bech32_address: 'an83characterlonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1tt5tgs',
    },
    description: 'Long bech32 address is handled',
    expected: {},
  },
  {
    args: {bech32_address: 'foo',},
    description: 'Nothing returned for broken bech32 address',
    expected: {},
  },
  {
    args: {p2pkh_address: '1Cak4mhFsBG3X8xtqSnZsAHWzhUWTW31bR'},
    description: 'Script derived from p2pkh address',
    expected: {
      script: '76a9147f0b0f291632f1cdcb2854fc555e69dc957bb94588ac',
    },
  },
  {
    args: {p2pkh_address: 'foo'},
    description: 'Nothing derived for broken p2pkh address',
    expected: {},
  },
  {
    args: {p2sh_address: '3EENzQdQS3BvvnkeJjC5uVwUKFuTczpnok'},
    description: 'Script derived from p2sh address',
    expected: {
      script: 'a914898ffd60ad6091221250047a9f2bd6456190263487',
    },
  },
  {
    args: {p2sh_address: 'foo'},
    description: 'Nothing derived for broken p2sh address',
    expected: {},
  },
  {
    args: {},
    description: 'Nothing returned for no recognized address',
    expected: {},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    const {script} = scriptFromChainAddress(args);

    equal(script, expected.script, 'Script derived from address');

    return end();
  });
});
