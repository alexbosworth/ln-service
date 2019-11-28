const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const {abs} = Math;
const decBase = 10;
const {isArray} = Array;
const msPerSec = 1e3;
const notFound = -1;

/** Get chain transactions.

  {
    lnd: <Authenticated LND gRPC Object>
  }

  @returns via cbk or Promise
  {
    transactions: [{
      [block_id]: <Block Hash String>
      [confirmation_count]: <Confirmation Count Number>
      [confirmation_height]: <Confirmation Block Height Number>
      created_at: <Created ISO 8601 Date String>
      [fee]: <Fees Paid Tokens Number>
      id: <Transaction Id String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Transaction Outbound Bool>
      output_addresses: [<Address String>]
      tokens: <Tokens Including Fee Number>
      [transaction]: <Raw Transaction Hex String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({lnd, method: 'getTransactions', type: 'default'})) {
          return cbk([400, 'ExpectedLndToGetChainTransactions']);
        }

        return cbk();
      },

      // Get transactions
      getTransactions: ['validate', ({}, cbk) => {
        return lnd.default.getTransactions({}, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedGetChainTransactionsError', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedGetChainTransactionsResponse']);
          }

          if (!isArray(res.transactions)) {
            return cbk([503, 'ExpectedTransactionsList', res]);
          }

          return cbk(null, res.transactions);
        });
      }],

      // Format transactions
      formatted: ['getTransactions', ({getTransactions}, cbk) => {
        return asyncMapSeries(getTransactions, (transaction, cbk) => {
          if (!transaction.amount) {
            return cbk([503, 'ExpectedTransactionAmountInChainTransaction']);
          }

          if (typeof transaction.block_hash !== 'string') {
            return cbk([503, 'ExpectedTransactionBlockHashInChainTx']);
          }

          if (transaction.block_height === undefined) {
            return cbk([503, 'ExpectedChainTransactionBlockHeightNumber']);
          }

          if (!isArray(transaction.dest_addresses)) {
            return cbk([503, 'ExpectedChainTransactionDestinationAddresses']);
          }

          if (transaction.dest_addresses.findIndex(n => !n) !== notFound) {
            return cbk([503, 'ExpectedDestinationAddressesInChainTx']);
          }

          if (transaction.num_confirmations === undefined) {
            return cbk([503, 'ExpectedChainTransactionConfirmationsCount']);
          }

          if (!transaction.time_stamp) {
            return cbk([503, 'ExpectedChainTransactionTimestamp']);
          }

          if (!transaction.total_fees) {
            return cbk([503, 'ExpectedChainTransactionTotalFees']);
          }

          if (!transaction.tx_hash) {
            return cbk([503, 'ExpectedChainTransactionId']);
          }

          const epochTime = parseInt(transaction.time_stamp, decBase);

          return cbk(null, {
            block_id: transaction.block_hash || undefined,
            confirmation_count: transaction.num_confirmations || undefined,
            confirmation_height: transaction.block_height || undefined,
            created_at: new Date(epochTime * msPerSec).toISOString(),
            fee: parseInt(transaction.total_fees, decBase) || undefined,
            id: transaction.tx_hash,
            is_confirmed: !!transaction.num_confirmations,
            is_outgoing: (parseInt(transaction.amount, decBase) < 0),
            output_addresses: transaction.dest_addresses,
            tokens: abs(parseInt(transaction.amount, decBase)),
            transaction: transaction.raw_tx_hex || undefined,
          });
        },
        cbk);
      }],

      // Final transactions list
      transactions: ['formatted', ({formatted}, cbk) => {
        return cbk(null, {transactions: formatted});
      }],
    },
    returnResult({reject, resolve, of: 'transactions'}, cbk));
  });
};
