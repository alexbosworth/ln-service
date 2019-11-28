const {test} = require('tap');

const {getChannelBalance} = require('./../../');

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndGrpcApiForChannelBalanceQuery'],
  },
  {
    args: {lnd: {default: {channelBalance: ({}, cbk) => cbk('err')}}},
    description: 'An error from LND is passed back',
    error: [503, 'UnexpectedGetChannelBalanceError', {err: 'err'}],
  },
  {
    args: {lnd: {default: {channelBalance: ({}, cbk) => cbk()}}},
    description: 'A result is expected',
    error: [503, 'ExpectedGetChannelBalanceResponse'],
  },
  {
    args: {lnd: {default: {channelBalance: ({}, cbk) => cbk(null, {})}}},
    description: 'A channel balance number is expected',
    error: [503, 'ExpectedChannelBalance'],
  },
  {
    args: {
      lnd: {default: {channelBalance: ({}, cbk) => cbk(null, {balance: '1'})}},
    },
    description: 'A pending open balance is expected',
    error: [503, 'ExpectedPendingOpenBalance'],
  },
  {
    args: {
      lnd: {
        default: {
          channelBalance: ({}, cbk) => cbk(null, {
            balance: '1',
            pending_open_balance: '1',
          }),
        },
      },
    },
    description: 'Channel balances are returned',
    expected: {channel_balance: 1, pending_balance: 1},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getChannelBalance(args), error, 'Got expected error');
    } else {
      const balances = await getChannelBalance(args);

      deepEqual(balances, expected, 'Got channel balances');
    }

    return end();
  });
});
