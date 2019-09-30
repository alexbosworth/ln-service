const {test} = require('tap');

const {getPendingChainBalance} = require('./../../');

const pendingChannels = ({}, cbk) => cbk(null, {total_limbo_balance: '1'});
const walletBalance = ({}, cbk) => cbk(null, {unconfirmed_balance: '1'});

const tests = [
  {
    args: {},
    description: 'Need lnd to get pending chain balance',
    error: [400, 'ExpectedLndForPendingChainBalance'],
  },
  {
    args: {lnd: {}},
    description: 'Need authenticated lnd to get pending chain balance',
    error: [400, 'ExpectedLndForPendingChainBalance'],
  },
  {
    args: {lnd: {default: {}}},
    description: 'Need lnd with pendingChannels method to get pending balance',
    error: [400, 'ExpectedLndForPendingChainBalance'],
  },
  {
    args: {
      lnd: {
        default: {walletBalance, pendingChannels: ({}, cbk) => cbk('err')},
      },
    },
    description: 'Report unexpected errors with pending channels',
    error: [503, 'GetPendingChannelsErr', {err: 'err'}],
  },
  {
    args: {
      lnd: {
        default: {walletBalance, pendingChannels: ({}, cbk) => cbk()},
      },
    },
    description: 'A result is required for the response',
    error: [503, 'ExpectedTotalLimboBalance'],
  },
  {
    args: {
      lnd: {
        default: {walletBalance, pendingChannels: ({}, cbk) => cbk(null, {})},
      },
    },
    description: 'The total limbo balance is required in the response',
    error: [503, 'ExpectedTotalLimboBalance'],
  },
  {
    args: {
      lnd: {
        default: {pendingChannels, walletBalance: ({}, cbk) => cbk('err')},
      },
    },
    description: 'Wallet balance errors are returned',
    error: [503, 'GetChainBalanceError', {err: 'err'}],
  },
  {
    args: {
      lnd: {default: {pendingChannels, walletBalance: ({}, cbk) => cbk()}},
    },
    description: 'Wallet balance result must be returned',
    error: [503, 'ExpectedUnconfirmedBalance'],
  },
  {
    args: {
      lnd: {
        default: {pendingChannels, walletBalance: ({}, cbk) => cbk(null, {})},
      },
    },
    description: 'Wallet balance result must have the balance attribute',
    error: [503, 'ExpectedUnconfirmedBalance'],
  },
  {
    args: {lnd: {default: {pendingChannels, walletBalance}}},
    description: 'Pending balance is returned',
    expected: {pending_chain_balance: 2},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, equal, rejects}) => {
    if (!!error) {
      rejects(getPendingChainBalance(args), error, 'Got expected error');
    } else {
      const got = (await getPendingChainBalance(args)).pending_chain_balance;

      equal(got, expected.pending_chain_balance, 'Pending chain balance');
    }

    return end();
  });
});
