const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');
const {rpcTxAsTransaction} = require('lightning/lnd_responses');

const {isLnd} = require('./../grpc');

const {isArray} = Array;
const offset = 1;

/** Get chain transactions.

  Requires `onchain:read` permission

  `after` and `before` are not supported on LND 0.10.0 and below

  {
    [after]: <Confirmed After Current Best Chain Block Height Number>
    [before]: <Confirmed Before Current Best Chain Block Height Number>
    lnd: <Authenticated LND Object>
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
module.exports = ({after, before, lnd}, cbk) => {
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
        return lnd.default.getTransactions({
          end_height: !!before ? before - offset : undefined,
          start_height: !!after ? after + offset : undefined,
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedGetChainTransactionsError', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedGetChainTransactionsResponse']);
          }

          if (!isArray(res.transactions)) {
            return cbk([503, 'ExpectedTransactionsList', res]);
          }

          try {
            const transactions = res.transactions.map(rpcTxAsTransaction);

            return cbk(null, {transactions});
          } catch (err) {
            return cbk([503, err.message]);
          }
        });
      }],
    },
    returnResult({reject, resolve, of: 'getTransactions'}, cbk));
  });
};
