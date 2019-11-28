const {test} = require('tap');

const {getChainTransactions} = require('./../../');

const makeExpected = overrides => {
  const transaction = {
    block_id: 'block_hash',
    confirmation_count: 1,
    confirmation_height: 1,
    created_at: '1970-01-01T00:00:01.000Z',
    fee: 1,
    id: 'tx_hash',
    is_confirmed: true,
    is_outgoing: false,
    output_addresses: ['address'],
    tokens: 1,
    transaction: undefined,
  };

  Object.keys(overrides).forEach(k => transaction[k] = overrides[k]);

  return {transactions: [transaction]};
};

const makeLnd = overrides => {
  return {
    default: {
      getTransactions: ({}, cbk) => {
        const transaction = {
          amount: '1',
          block_hash: 'block_hash',
          block_height: 1,
          dest_addresses: ['address'],
          num_confirmations: 1,
          time_stamp: '1',
          total_fees: '1',
          tx_hash: 'tx_hash',
        };

        Object.keys(overrides).forEach(k => transaction[k] = overrides[k]);

        return cbk(null, {transactions: [transaction]});
      },
    },
  };
};

const tests = [
  {
    args: {},
    description: 'LND Object is required to get chain transactions',
    error: [400, 'ExpectedLndToGetChainTransactions'],
  },
  {
    args: {lnd: {default: {getTransactions: ({}, cbk) => cbk('err')}}},
    description: 'Errors are passed back from get transactions method',
    error: [503, 'UnexpectedGetChainTransactionsError', {err: 'err'}],
  },
  {
    args: {lnd: {default: {getTransactions: ({}, cbk) => cbk()}}},
    description: 'A response is expected from get transactions',
    error: [503, 'ExpectedGetChainTransactionsResponse'],
  },
  {
    args: {lnd: {default: {getTransactions: ({}, cbk) => cbk(null, {})}}},
    description: 'An array of transactions is expected when getting txs',
    error: [503, 'ExpectedTransactionsList'],
  },
  {
    args: {lnd: makeLnd({amount: null})},
    description: 'An amount is expected in a chain transaction',
    error: [503, 'ExpectedTransactionAmountInChainTransaction'],
  },
  {
    args: {lnd: makeLnd({block_hash: null})},
    description: 'A block hash is expected in a chain transaction',
    error: [503, 'ExpectedTransactionBlockHashInChainTx'],
  },
  {
    args: {lnd: makeLnd({block_height: undefined})},
    description: 'A block height is expected in a chain transaction',
    error: [503, 'ExpectedChainTransactionBlockHeightNumber'],
  },
  {
    args: {lnd: makeLnd({block_height: undefined})},
    description: 'A block height is expected in a chain transaction',
    error: [503, 'ExpectedChainTransactionBlockHeightNumber'],
  },
  {
    args: {lnd: makeLnd({dest_addresses: undefined})},
    description: 'Destinations are expected in a chain transaction',
    error: [503, 'ExpectedChainTransactionDestinationAddresses'],
  },
  {
    args: {lnd: makeLnd({dest_addresses: ['']})},
    description: 'Addresses are expected in a chain transaction destinations',
    error: [503, 'ExpectedDestinationAddressesInChainTx'],
  },
  {
    args: {lnd: makeLnd({num_confirmations: undefined})},
    description: 'Conf count is expected in a chain transaction',
    error: [503, 'ExpectedChainTransactionConfirmationsCount'],
  },
  {
    args: {lnd: makeLnd({time_stamp: undefined})},
    description: 'A timestamp is expected in a chain transaction',
    error: [503, 'ExpectedChainTransactionTimestamp'],
  },
  {
    args: {lnd: makeLnd({total_fees: undefined})},
    description: 'Total fees are expected in a chain transaction',
    error: [503, 'ExpectedChainTransactionTotalFees'],
  },
  {
    args: {lnd: makeLnd({tx_hash: undefined})},
    description: 'Tx hash is expected in a chain transaction',
    error: [503, 'ExpectedChainTransactionId'],
  },
  {
    args: {lnd: makeLnd({})},
    description: 'Get transactions and map them to normalized transactions',
    expected: makeExpected({}),
  },
  {
    args: {lnd: makeLnd({block_hash: ''})},
    description: 'An empty block hash results in no block id',
    expected: makeExpected({block_id: undefined}),
  },
  {
    args: {lnd: makeLnd({num_confirmations: 0})},
    description: 'Zero confirmations means no conf count, not confirmed',
    expected: makeExpected({
      confirmation_count: undefined,
      is_confirmed: false,
    }),
  },
  {
    args: {lnd: makeLnd({block_height: 0})},
    description: 'An empty block height results in no block height',
    expected: makeExpected({confirmation_height: undefined}),
  },
  {
    args: {lnd: makeLnd({total_fees: '0'})},
    description: 'A zero fee is interpreted as an undefined fee',
    expected: makeExpected({fee: undefined}),
  },
  {
    args: {lnd: makeLnd({amount: '-1'})},
    description: 'A negative amount is treated as outgoing',
    expected: makeExpected({is_outgoing: true, tokens: 1}),
  },
  {
    args: {lnd: makeLnd({raw_tx_hex: 'raw_tx_hex'})},
    description: 'A raw transaction hex is passed along as a raw tx',
    expected: makeExpected({transaction: 'raw_tx_hex'}),
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getChainTransactions(args), error, 'Got expected error');
    } else {
      const {transactions} = await getChainTransactions(args);

      deepEqual(transactions, expected.transactions, 'Got transactions');
    }

    return end();
  });
});
