const {test} = require('tap');

const {getChainBalance} = require('./../../');

const tests = [
  {
    args: {},
    description: 'LND Object is required to get chain balance',
    error: [400, 'ExpectedAuthenticatedLndToRetrieveChainBalance'],
  },
  {
    args: {lnd: {default: {walletBalance: ({}, cbk) => cbk('err')}}},
    description: 'Errors are passed back from wallet balance method',
    error: [503, 'UnexpectedErrorWhenGettingChainBalance', {err: 'err'}],
  },
  {
    args: {lnd: {default: {walletBalance: ({}, cbk) => cbk()}}},
    description: 'A result is expected from the wallet balance method',
    error: [503, 'ExpectedResponseForChainBalanceRequest'],
  },
  {
    args: {lnd: {default: {walletBalance: ({}, cbk) => cbk(null, {})}}},
    description: 'A confirmed balance is expected in wallet balance',
    error: [503, 'ExpectedConfirmedBalanceInBalanceResponse'],
  },
  {
    args: {
      lnd: {
        default: {
          walletBalance: ({}, cbk) => cbk(null, {confirmed_balance: '1'}),
        },
      },
    },
    description: 'A confirmed balance is returned',
    expected: {chain_balance: 1},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getChainBalance(args), error, 'Got expected error');
    } else {
      const res = await getChainBalance(args);

      equal(res.chain_balance, expected.chain_balance, 'Got chain balance');
    }

    return end();
  });
});
