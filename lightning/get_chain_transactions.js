const {abs} = Math;

const transactionRowType = require('./conf/row_types').chain_transaction;

const decBase = 10;
const msPerSec = 1e3;

/** Get Blockchain transactions.

  {
    lnd: <LND GRPC Object>
  }

  @returns via cbk
  {
    transactions: [{
      [block_id]: <Block Hash String>
      [confirmation_count]: <Confirmation Count Number>
      [confirmation_height]: <Confirmation Block Height Number>
      created_at: <Created ISO 8601 Date String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Transaction Outbound Bool>
      [fee]: <Fees Paid Tokens Number>
      id: <Transaction Id String>
      output_addresses: [<Address String>]
      tokens: <Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.getTransactions) {
    return cbk([400, 'ExpectedLndToGetChainTransactions']);
  }

  return lnd.getTransactions({}, (err, res) => {
    if (!!err) {
      return cbk([503, 'GetTransactionsErr', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedGetChainTransactionsResponse']);
    }

    if (!Array.isArray(res.transactions)) {
      return cbk([503, 'ExpectedTransactionsList', res]);
    }

    try {
      const transactions = res.transactions.map(transaction => {
        if (!transaction.amount) {
          throw new Error('ExpectedTransactionAmount');
        }

        if (typeof transaction.block_hash !== 'string') {
          throw new Error('ExpectedTransactionBlockHash');
        }

        if (transaction.block_height === undefined) {
          throw new Error('ExpectedTransactionBlockHeightNumber');
        }

        if (!Array.isArray(transaction.dest_addresses)) {
          throw new Error('ExpectedTransactionDestinationAddresses');
        }

        if (transaction.num_confirmations === undefined) {
          throw new Error('ExpectedTransactionConfirmationsCount');
        }

        if (!transaction.time_stamp) {
          throw new Error('ExpectedTransactionTimestamp');
        }

        if (!transaction.total_fees) {
          throw new Error('ExpectedTransactionTotalFees');
        }

        if (!transaction.tx_hash) {
          throw new Error('ExpectedChainTransactionId');
        }

        const dateTime = parseInt(transaction.time_stamp, decBase) * msPerSec;
        const totalFees = transaction.total_fees;

        const outputAddresses = transaction.dest_addresses.map(n => {
          if (!n) {
            throw new Error('ExpectedDestinationAddress');
          }

          return n;
        });

        return {
          block_id: transaction.block_hash || undefined,
          confirmation_count: transaction.num_confirmations || undefined,
          confirmation_height: transaction.block_height || undefined,
          created_at: new Date(dateTime).toISOString(),
          fee: totalFees === '0' ? undefined : parseInt(totalFees, decBase),
          id: transaction.tx_hash,
          is_confirmed: !!transaction.num_confirmations,
          is_outgoing: (parseInt(transaction.amount, decBase) < 0),
          output_addresses: outputAddresses,
          tokens: abs(parseInt(transaction.amount, decBase)),
          type: transactionRowType,
        };
      });

      return cbk(null, {transactions});
    } catch (err) {
      return cbk([503, err.message, res]);
    }
  });
};

