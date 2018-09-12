const transactionRowType = require('./conf/row_types').chain_transaction;

const intBase = 10;
const msPerSec = 1e3;

/** Get Blockchain transactions.

  {
    lnd: <Object>
  }

  @returns via cbk
  {
    transactions: [{
      [block_id]: <Block Hash String>
      confirmation_count: <Confirmation Count Number>
      created_at: <Created ISO 8601 Date String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Transaction Outbound Bool>
      fee: <Fees Paid Tokens Number>
      id: <Transaction Id String>
      tokens: <Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd) {
    return cbk([400, 'ExpectedLnd']);
  }

  return lnd.getTransactions({}, (err, res) => {
    if (!!err) {
      return cbk([503, 'GetTransactionsErr', err]);
    }

    if (!res || !Array.isArray(res.transactions)) {
      return cbk([500, 'ExpectedTransactionsList', res]);
    }

    const transactions = res.transactions.map(transaction => {
      const dateTime = parseInt(transaction.time_stamp, intBase) * msPerSec;

      return {
        block_id: transaction.block_hash || null,
        confirmation_count: transaction.num_confirmations || 0,
        created_at: new Date(dateTime).toISOString(),
        fee: parseInt(transaction.total_fees, intBase),
        id: transaction.tx_hash,
        is_confirmed: !!transaction.num_confirmations,
        is_outgoing: (parseInt(transaction.amount, intBase) < 0),
        tokens: Math.abs(parseInt(transaction.amount, intBase)),
        type: transactionRowType,
      };
    });

    return cbk(null, {transactions});
  });
};

